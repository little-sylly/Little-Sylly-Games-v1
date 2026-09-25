# Lobby Production Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four-layout lobby (the Lounge, TV, Shelves, Original), with the Lounge as the first view, as SW v231, with every "back to the lobby" in the app going through one router seam.

**Architecture:** A scripted, collision-checked copy moves the sandbox out of `wip/` into `js/lounge/` (the 3D room) and `js/lobby/` (layouts, router, doors, host). The router stays a pure reducer (`lobby-router.js`, Node-tested); `lobby-host.js` owns every effect and exposes `lobbyShow()`, the only entry into the lobby. `controller.js` splits its model from its renderer so the Lounge's 3D controller can borrow the Workshop's painted textures, and the one ornament canvas moves between the three non-Lounge layouts.

**Tech Stack:** Vanilla JS (global scripts, no modules, no build step), Three.js r128 (vendored), Node harnesses (`tools/verify-*.js`), Playwright harnesses (`tools/visual-*.js`, optional tooling, exits 0 when absent).

**Spec:** `docs/superpowers/specs/2026-09-25-lobby-production-wiring-design.md` — read it before Task 1; this plan argues from it.

## Global Constraints

- **No commits until Task 14.** The owner backed the folder up and asked for one commit at the end.
- No runtime build step, no npm, no new library. `tools/*.js` are dev tooling only.
- **Never edit `index.html` by hand** — edit `src/screens/*.html`, then `node tools/build-index.js` and `node tools/verify-build-fresh.js`.
- Screen visibility is `showScreen()`'s inline `style.display` only. Never the `hidden` attribute on a screen (BUG-19). Harness visibility checks measure a box (`getBoundingClientRect`), never an attribute or a style the code wrote.
- **One** SW bump for the whole round: `sylly-games-v230` → `sylly-games-v231`.
- **No new localStorage key.** Permitted keys are unchanged (`sylly_nickname`, `isMuted`/`masterVolume`, `sylly_controller`).
- Sound effects stay synthesised (`lounge-sfx.js` is Web Audio, gated on `isMuted || !sfxEnabled`).
- New markup names its transition property — no new `transition-all`.
- Australian English in all copy and docs.
- User-facing name is **"the Lounge"**; internal ids: layouts `lounge` / `tv` / `shelves` / `original`; prefixes `lou` (room), `tv` (TV layout), `lb` (layout helpers), `lobby` (router/doors/host), `ach`, `sb`.
- The fourth layout's label is "Original"; its id stays `original` whatever the label becomes.
- Every harness count named in this plan is recorded in Task 1 and re-run in Task 12. A count may only change in the task that says it changes.

## Review Focus

1. **Cold offline first launch** (both runtime caches empty) — the Lounge must still mount; the binder must say the book could not load. → Task 9 scenario 9, Task 10.
2. **A handed-out phone reaching the Lounge by any route** (a switcher, `home`, `workshopClose`, `stickerbookClose`, a resize) — every one refused. → Task 4 router checks, Task 9 scenario 2.
3. **A stale deferred ornament mount** (`requestIdleCallback`, up to 1.2 s) landing after the player already moved layouts — the canvas must end in the *current* layout's slot. → Task 9 scenario 11.
4. **Returning to the Lounge after a door transition left `#lou-fade` lit** — the room must be visible (fade opacity 0), not an off-white pane. → Task 9 scenario 12.
5. **A window resized below a layout's floor** while in TV or the Lounge — TV shows its hand-off card, the Lounge plays the arrival beat into Shelves; never a broken layout. → Task 9 scenario 13.

---

## File map

| File | Status | Responsibility |
|------|--------|----------------|
| `tools/migrate-lobby-sandbox.js` | create (Task 2), delete (Task 12) | one-off scripted copy + rename out of `wip/` |
| `js/lounge/lounge-{lib,room,props,scene,sfx}.js` | created by migration | the 3D room (was `prm-*`) |
| `js/lobby/lobby-games.js` | created by migration | the verified 20-game data table (`GAMES`, `SHELVES`) |
| `js/lobby/lobby.js` | created by migration, edited Task 7 | Shelves layout + shared `lb*` helpers + the TV hand-off card |
| `js/lobby/tv.js` | created by migration, edited Task 7 | TV layout (was the sandbox's `lounge.js`) |
| `js/lobby/achievements.js` | created by migration, edited Task 3 | stickerbook rules (pure) + `achAllPlaced` |
| `js/lobby/stickerbook.js` | created by migration | the book's DOM |
| `js/lobby/lobby-router.js` | created by migration, edited Task 4 | pure reducer + `LOBBY_LAYOUTS` |
| `js/lobby/lobby-doors.js` | created by migration, edited Task 4 | pure door map + scene-host builder |
| `js/lobby/lobby-host.js` | create (Task 10) | every lobby effect; `lobbyBoot/Show/Go/Launch` |
| `css/lobby.css` | created by migration | layouts + stickerbook + Lounge HUD + screen rules |
| `data/lamp/` | created by migration | lamp photos, runtime-cached |
| `src/screens/lobby.html` | create (Task 8) | three screens + switcher + stickerbook containers |
| `js/controller.js` | modify (Task 5) | model/renderer split, `ctlMountOrnament`, `ctlOrnamentIsLive` |
| `js/engine.js`, `js/secret-mode.js`, `js/app.js` | modify (Tasks 8, 10) | `allScreens`, the router seam, boot |
| `src/screens/_shell.html`, `_head.html`, `_scripts-3.html`, `src/manifest.txt` | modify (Tasks 8, 10) | markup, css link, script tags |
| `sw.js` | modify (Task 11) | precache, `data/lamp/` runtime branch, v231 |
| `tools/verify-lounge-props.js`, `visual-lounge.js`, `fixtures/lounge.html`, `verify-tv.js`, `verify-achievements.js`, `verify-lobby-router.js` | created by migration | ported harnesses |
| `tools/visual-lobby.js` | create (Task 9) | production browser harness over the real `index.html` |
| `tools/visual-controller-stickers.js` | modify (Tasks 5, 10) | +2 model checks; ornament-slot tolerance for the new boot |

---

### Task 1: Baseline — record every harness count before anything moves

**Files:** none modified.

- [ ] **Step 1: Run the production suite and record each count**

```bash
cd "D:/Coding Projects/Little-Sylly-Games"
for t in verify-build-fresh verify-mp-configs verify-identity-docs verify-controller-body verify-controller-state verify-controller-stickers verify-cjar-deck verify-cjar-loop verify-cjar-dd verify-cjar-loopback verify-cld-physics verify-cld-loop verify-cld-loopback verify-comb-board verify-comb-rules verify-comb-loop verify-comb-loopback verify-pko-chain verify-pko-loop verify-pko-events verify-dyb-dice verify-shp-loop verify-shp-loopback verify-nt-loopback verify-jec-loop verify-jec-loopback verify-flw-loopback; do printf '%-28s ' $t; node tools/$t.js 2>&1 | tail -1; done
node tools/visual-controller-stickers.js 2>&1 | tail -2
```

Expected: every line green. Note each count in a scratch list (outside the repo); Task 12 compares against it.

- [ ] **Step 2: Run the sandbox harnesses and record each count**

```bash
node wip/premium/verify-prm-props.js | tail -1      # expect 1322 passed, 0 failed
node wip/premium/visual-prm.js | tail -1            # expect 29
node wip/lobby-lab/verify-shell.js | tail -1        # expect 182
node wip/lobby-lab/verify-lounge.js | tail -1       # expect 919
node wip/lobby-lab/verify-achievements.js | tail -1 # expect 75
```

If any number differs from the comment, **record the real number** — it is the baseline Task 2 must reproduce.

---

### Task 2: The migration — copy and rename out of `wip/`, prove nothing changed

**Files:**
- Create: `tools/migrate-lobby-sandbox.js`
- Created by it: every file in the File map marked "created by migration", plus `data/lamp/*`

**Interfaces:**
- Produces: globals `LouLib`, `LouRoom`, `LouProps`, `LouScene` (with `louMount`, `louEligible`, `louCanArrive`, `louArriveMs`, `LOU_REQUIRED`…), `LouSfx.louCreateSfx`; `window.TV_STATE`, `tvMount`, `tvDrop`, `tvSelect`…; `LobbyRouter` (`LOBBY_VIEWS`, `LOBBY_INIT`, `LOBBY_PAGE_ACTIONS`, `lobbyReduce`); `LobbyDoors` (`LOBBY_DOORS`, `lobbyCreateHost`); `GAMES`, `SHELVES`; `Achievements`; `Stickerbook.sbMount`. DOM ids in `css/lobby.css`: `#lou-stage`, `#lou-canvas`, `#lou-vignette`, `#lou-hud`, `#lou-heading`, `#lou-status`, `#lou-focus`, `#lou-fade`, `#stickerbook-overlay`.

- [ ] **Step 1: Write the migration script**

Create `tools/migrate-lobby-sandbox.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// tools/migrate-lobby-sandbox.js — ONE-OFF (lobby production wiring, SW v231).
// Copies what the production lobby needs out of wip/ into js/, css/, data/ and
// tools/, applying the Lounge / TV / lobby renames, after checking that no
// renamed identifier collides with one production already has. Deleted at the
// end of the round (plan Task 12): wip/ is archived after that.
//
//   node tools/migrate-lobby-sandbox.js --check   # collision check + dry run, writes nothing
//   node tools/migrate-lobby-sandbox.js           # writes; refuses to overwrite anything
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Rule groups are SCOPED per file on purpose: the TV attract screen prints
// "LITTLE SYLLY'S LOUNGE" (lounge-props) and the jukebox has locals named
// shellL / shellIn — neither may meet the TV or router rules.
const PRM = [
  [/prm-(lib|room|props|scene|sfx)\.js/g, 'lounge-$1.js'],
  [/\bPrm([A-Z])/g, 'Lou$1'],
  [/\bprm([A-Z])/g, 'lou$1'],
  [/\bPRM_/g, 'LOU_'],
  [/\bprm-/g, 'lou-'],
];
const TV = [
  [/\blg([A-Z])/g, 'tv$1'],
  [/\bLG_/g, 'TV_'],
  [/\bLOUNGE\b/g, 'TV_STATE'],
  [/__lounge\b/g, '__tv'],
];
const SHELL = [
  [/\bShellHost\b/g, 'LobbyDoors'],
  [/\bShell([A-Z])/g, 'Lobby$1'],
  [/\bshell([A-Z])/g, 'lobby$1'],
  [/\bSHELL_/g, 'LOBBY_'],
  [/leaveShell/g, 'leaveLobby'],
  [/'premium'/g, "'lounge'"],
];
const P = (from, to) => ({ from, to });   // literal rewrite: must match at least once or the run aborts

const FILES = [
  ['wip/premium/prm-lib.js',   'js/lounge/lounge-lib.js',   PRM, []],
  ['wip/premium/prm-room.js',  'js/lounge/lounge-room.js',  PRM, []],
  ['wip/premium/prm-props.js', 'js/lounge/lounge-props.js', PRM, []],
  ['wip/premium/prm-scene.js', 'js/lounge/lounge-scene.js', PRM, []],
  ['wip/premium/prm-sfx.js',   'js/lounge/lounge-sfx.js',   PRM, []],
  ['wip/premium/verify-prm-props.js', 'tools/verify-lounge-props.js', PRM, [
    P("path.join(__dirname, '..', '..')", "path.join(__dirname, '..')"),
    P("'wip/lobby-lab/games.js'", "'js/lobby/lobby-games.js'"),
    P("'wip/premium/lounge-", "'js/lounge/lounge-"),
    P("'wip/premium/lamp images/manifest.json'", "'data/lamp/manifest.json'"),
    P("base: 'lamp images/'", "base: 'data/lamp/'"),
  ]],
  ['wip/premium/visual-prm.js', 'tools/visual-lounge.js', PRM, [
    P("path.resolve(__dirname, '..', '..')", "path.resolve(__dirname, '..')"),
    P("const SHOTS = path.join(__dirname, 'shots');",
      "const SHOTS = path.join(os.tmpdir(), 'lsg-lounge-shots'); fs.mkdirSync(SHOTS, { recursive: true });"),
    P('/wip/premium/index.html', '/tools/fixtures/lounge.html'),
  ]],
  ['wip/premium/index.html', 'tools/fixtures/lounge.html', PRM, [
    P('<title>Premium — the lounge (sandbox)</title>', '<title>Lounge — harness fixture</title>'),
    P('href="lou-hud.css"', 'href="../../css/lobby.css"'),
    P('src="../lobby-lab/games.js"', 'src="../../js/lobby/lobby-games.js"'),
    P('src="lounge-', 'src="../../js/lounge/lounge-'),
    P("fetch('lamp images/manifest.json')", "fetch('../../data/lamp/manifest.json')"),
    P("base: 'lamp images/'", "base: '../../data/lamp/'"),
    // Fixture-only chrome, kept OUT of css/lobby.css: the html/body rule would stop
    // every game screen scrolling if it ever shipped in the app's stylesheet.
    P('</head>', `<style>
  html, body { margin: 0; height: 100%; background: #FAFAF9; font-family: Fredoka, system-ui, sans-serif; color: #2B1B45; overflow: hidden; }
  #lou-tools { position: absolute; right: 24px; top: 24px; display: flex; gap: 8px; }
  .lou-keycap { border: 0; border-radius: 14px; padding: 10px 16px; font: 600 15px Fredoka, sans-serif; color: #fff; background: #E9408E; box-shadow: 0 4px 0 rgba(0,0,0,0.18); cursor: pointer; }
  .lou-keycap.lou-light { background: #fff; color: #2B1B45; }
  .lou-swatch { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 0 rgba(0,0,0,0.18); cursor: pointer; }
  #lou-card { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; padding: 24px; background: #FAFAF9; }
  #lou-card.on { display: flex; }
  #lou-card > div { max-width: 360px; text-align: center; }
</style>
</head>`),
  ]],
  ['wip/lobby-lab/lounge.js',       'js/lobby/tv.js',        TV, []],
  ['wip/lobby-lab/verify-lounge.js', 'tools/verify-tv.js',   TV, [
    P("require('./games.js')", "require('../js/lobby/lobby-games.js')"),
    P("require('./lounge.js')", "require('../js/lobby/tv.js')"),
  ]],
  ['wip/lobby-lab/lobby.js',        'js/lobby/lobby.js',     TV, []],
  ['wip/lobby-lab/games.js',        'js/lobby/lobby-games.js', [], []],
  ['wip/lobby-lab/achievements.js', 'js/lobby/achievements.js', [], []],
  ['wip/lobby-lab/stickerbook.js',  'js/lobby/stickerbook.js', [[/#shell-stickerbook/g, '#stickerbook-overlay']], []],
  ['wip/lobby-lab/verify-achievements.js', 'tools/verify-achievements.js', [], [
    P("path.join(__dirname, '..', '..', 'data'", "path.join(__dirname, '..', 'data'"),
    P("require('./achievements.js')", "require('../js/lobby/achievements.js')"),
  ]],
  ['wip/lobby-lab/shell-router.js', 'js/lobby/lobby-router.js', SHELL, []],
  ['wip/lobby-lab/shell-host.js',   'js/lobby/lobby-doors.js',  SHELL, []],
  ['wip/lobby-lab/verify-shell.js', 'tools/verify-lobby-router.js', SHELL.concat(PRM), [
    P("require('./games.js')", "require('../js/lobby/lobby-games.js')"),
    P("require('./shell-router.js')", "require('../js/lobby/lobby-router.js')"),
    P("require('../premium/lounge-scene.js')", "require('../js/lounge/lounge-scene.js')"),
    P("require('./shell-host.js')", "require('../js/lobby/lobby-doors.js')"),
  ]],
];

// The Lounge's HUD, production half only (was wip/premium/prm-hud.css). The
// sandbox file's html/body, tools, keycap, swatch and card rules live in the
// harness fixture instead, and its reduced-motion block is dropped: styles.css
// already carries the one global block (ui-style.md § Motion Standard).
const HUD_CSS = `
/* ── The Lounge's HUD — the 2D layer over the room canvas ───────────────────── */
#lou-stage { position: absolute; inset: 0; background: #FAFAF9; font-family: Fredoka, system-ui, sans-serif; color: #2B1B45; }
#lou-canvas { width: 100%; height: 100%; display: block; outline: none; }
#lou-canvas:focus-visible { box-shadow: inset 0 0 0 3px #2B1B45; }
#lou-vignette { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 48%, rgba(43,27,69,0.40) 100%); }
#lou-hud { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
#lou-hud > * { pointer-events: auto; }
#lou-heading { position: absolute; left: 32px; top: 24px; margin: 0; font-size: 28px; font-weight: 700; }
#lou-status { position: absolute; left: 32px; top: 64px; font-size: 14px; color: #6b5d80; min-height: 18px; }
#lou-focus { position: absolute; display: none; border: 3px solid #2B1B45; border-radius: 10px; pointer-events: none; }
#lou-fade { position: absolute; inset: 0; z-index: 1; background: #FAFAF9; opacity: 0; pointer-events: none; transition: opacity 200ms ease-out; }
#lou-fade.on { opacity: 1; pointer-events: auto; }
`;

// The three new screens and the ornament slots. NO display rule on any screen
// id: display is showScreen()'s inline style and nothing else (BUG-19).
const SCREENS_CSS = `
/* ── Lobby screens (SW v231) ────────────────────────────────────────────────── */
#screen-lounge, #screen-tv, #screen-shelves { position: fixed; inset: 0; }
#screen-shelves { justify-content: center; overflow-y: auto; background: #FAFAF9; }
#shelves-canvas { width: 390px; max-width: 100%; min-height: 100vh; position: relative; background: #FAFAF9; }
#tv-app { width: 100%; height: 100%; }
/* The ornament slots — the ONE controller canvas moves between these (ctlMountOrnament). */
.ctl-ornament { cursor: grab; touch-action: none; }
.ctl-ornament canvas { display: block; width: 100%; height: 100%; }
/* TV's slot replaces a PNG that sized itself: give the canvas a box, and hold it still —
   the controller animation round is deferred (owner, 25 Sep 2026). */
.lb-lg-ctl.ctl-ornament { display: block; aspect-ratio: 4 / 3; height: auto; animation: none; filter: none; }
`;

const CSS_OUT = 'css/lobby.css';
const CSS_BANNER = `/* ═══════════════════════════════════════════════════════════════════════════
   css/lobby.css — the lobby's four layouts (SW v231): Shelves + TV (the lb-* and
   lb-lg-* rules), the stickerbook (sb-*), the Lounge's HUD (#lou-*), and the
   screen + ornament-slot rules. Everything is scoped under a layout's own root;
   nothing here may style html, body or a bare element.
   ═══════════════════════════════════════════════════════════════════════════ */
`;

function transform(text, rules, rewrites, file) {
  let out = text;
  const counts = [];
  for (const [re, to] of rules) { let n = 0; out = out.replace(re, (...m) => { n++; return m[0].replace(re, to); }); counts.push(`${re} ×${n}`); }
  for (const { from, to } of rewrites) {
    if (!out.includes(from)) throw new Error(`${file}: literal not found — ${from}`);
    out = out.split(from).join(to);
  }
  return { out, counts };
}

// Identifiers the migration INTRODUCES must not already exist in production.
const idsOf = s => new Set(s.match(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g) || []);
function productionCorpus() {
  const ids = new Set();
  const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['js/lobby', 'js/lounge'].includes(p.replace(/\\/g, '/'))) walk(p); }
    else if (/\.(js|html|css)$/.test(e.name) && !/three\.min\.js$/.test(e.name)) idsOf(rd(p)).forEach(i => ids.add(i));
  });
  ['js', 'src/screens'].forEach(walk);
  ['css/styles.css', 'sw.js'].forEach(p => idsOf(rd(p)).forEach(i => ids.add(i)));
  return ids;
}

const corpus = productionCorpus();
const clashes = [];
const plan = FILES.map(([from, to, rules, rewrites]) => {
  const src = rd(from);
  const { out, counts } = transform(src, rules, rewrites, from);
  const before = idsOf(src);
  const introduced = [...idsOf(out)].filter(i => !before.has(i) && /^(lou|Lou|LOU_|tv|TV_|lobby|Lobby|LOBBY_)/.test(i));
  introduced.filter(i => corpus.has(i)).forEach(i => clashes.push(`${to}: ${i}`));
  return { from, to, out, counts, introduced };
});

plan.forEach(p => console.log(`${p.from} → ${p.to}\n    ${p.counts.join(' · ') || 'no renames'}\n    introduces ${p.introduced.length}: ${p.introduced.slice(0, 12).join(', ')}${p.introduced.length > 12 ? ' …' : ''}`));
if (clashes.length) { console.log('\nCOLLISIONS — nothing written:\n  ' + clashes.join('\n  ')); process.exit(1); }
console.log('\nno collisions with production identifiers');

const css = CSS_BANNER + rd('wip/lobby-lab/lobby.css') + '\n'
  + rd('wip/lobby-lab/stickerbook.css').replace(/#shell-stickerbook/g, '#stickerbook-overlay') + '\n'
  + HUD_CSS + SCREENS_CSS;
const LAMP_SRC = 'wip/premium/lamp images', LAMP_DST = 'data/lamp';
const lamp = fs.readdirSync(path.join(ROOT, LAMP_SRC));

const targets = plan.map(p => p.to).concat([CSS_OUT], lamp.map(f => `${LAMP_DST}/${f}`));
const exists = targets.filter(t => fs.existsSync(path.join(ROOT, t)));
if (exists.length) { console.log('\nREFUSING — already exists:\n  ' + exists.join('\n  ')); process.exit(1); }
if (CHECK) { console.log(`\n--check: would write ${targets.length} files`); process.exit(0); }

const put = (rel, data) => { const p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
plan.forEach(p => put(p.to, p.out));
put(CSS_OUT, css);
lamp.forEach(f => put(`${LAMP_DST}/${f}`, fs.readFileSync(path.join(ROOT, LAMP_SRC, f))));
console.log(`\nwrote ${targets.length} files`);
```

- [ ] **Step 2: Dry run**

Run: `node tools/migrate-lobby-sandbox.js --check`
Expected: every file listed with its rule counts, `no collisions with production identifiers`, `--check: would write N files`. **Read the introduced-identifier lists.** Anything that is plainly not a rename you meant (e.g. a `tv…` token created inside `lobby.js` that is not a TV function) → add a narrower rule and re-run. If it prints COLLISIONS, stop and resolve each by hand before continuing.

- [ ] **Step 3: Write**

Run: `node tools/migrate-lobby-sandbox.js`
Expected: `wrote N files`.

- [ ] **Step 4: Prove the ported harnesses reproduce Task 1's counts exactly**

```bash
node tools/verify-lounge-props.js | tail -1   # must equal Task 1's verify-prm-props count
node tools/verify-lobby-router.js | tail -1   # must equal verify-shell's
node tools/verify-tv.js | tail -1             # must equal verify-lounge's
node tools/verify-achievements.js | tail -1   # must equal verify-achievements'
node tools/visual-lounge.js | tail -1         # must equal visual-prm's
```

Expected: identical pass counts, 0 failed. A difference means a rename or a path rewrite changed behaviour — find it in the dry-run output before going on. (The sandbox originals under `wip/` are untouched; run them side by side if a count moves.)

- [ ] **Step 5: Check no ported runtime file still points into `wip/` or at a sandbox asset**

Run: `grep -rn "wip/\|lamp images\|\.\./\.\./\|tv-mode-design\|lounge props/" js/lounge js/lobby css/lobby.css`
Expected: hits only in **comments** of `js/lounge/*` (reference-render paths) and in `js/lobby/lobby.js` / `tv.js` asset paths — Task 7 fixes the latter. Rewrite each comment hit now to name the thing, not the path — e.g. `(the owner's reference render, archived with the sandbox)`.

---

### Task 3: Stylesheet sanity and `achAllPlaced`

**Files:**
- Modify: `js/lobby/achievements.js` (the `api` object near the end, and one new function)
- Modify: `tools/verify-achievements.js` (append a section before the summary)
- Check: `css/lobby.css`

**Interfaces:**
- Produces: `Achievements.achAllPlaced(book) → { v: 1, plays: {id: lastTier}, placed: {id: true} }`

- [ ] **Step 1: Confirm `css/lobby.css` styles nothing global**

Run: `grep -nE "^(html|body|:root|\*|button|img|a|h[1-6]|input)\b|^\s*(html|body)\s*," css/lobby.css`
Expected: no output. (`:where(.lb-phone button)` / `:where(.lb-tv button)` are scoped and fine.) Any hit: scope it under its layout root.

- [ ] **Step 2: Write the failing test**

Append to `tools/verify-achievements.js`, immediately before the final `console.log(\`\n${pass} passed…`):

```js
section('achAllPlaced — v1 ships everything unlocked, nothing saved (owner, 25 Sep 2026)');
{
  const book = A.achDefine(MANIFEST.stickers);
  const all = A.achAllPlaced(book);
  eq(Object.keys(all.placed).length, book.entries.length, 'every sticker is on its sleeve');
  eq(book.entries.every(e => A.achStatus(book, all, e.id) === 'placed'), true, 'every status reads placed');
  eq(A.achTray(book, all), [], 'the tray is empty');
  const p = A.achProgress(book, all);
  eq(p.done, p.total, 'every tier is complete, so no progress hint can dangle');
  eq(A.achRevive(JSON.parse(JSON.stringify(all)), book).placed, all.placed, 'it survives a revive untouched');
  eq(A.achAllPlaced(A.achDefine([])).placed, {}, 'an empty manifest gives an empty book');
}
```

- [ ] **Step 3: Run it to see it fail**

Run: `node tools/verify-achievements.js | tail -3`
Expected: FAIL / a TypeError — `A.achAllPlaced is not a function`.

- [ ] **Step 4: Implement**

In `js/lobby/achievements.js`, add above `const api = {`:

```js
  /* The production stickerbook's v1 (owner, 25 Sep 2026): everything unlocked,
     nothing saved. Every sticker earned, on its sleeve, and every tier complete —
     with no earn loop yet, a half-finished tier would show a progress hint that
     could never advance. The earn loop and its storage are deferred work. */
  function achAllPlaced(book) {
    const plays = {}, placed = {};
    book.entries.forEach(e => { plays[e.id] = e.tiers[e.tiers.length - 1]; placed[e.id] = true; });
    return { v: 1, plays, placed };
  }
```

and add `achAllPlaced` to the `api` object's list.

- [ ] **Step 5: Run to pass**

Run: `node tools/verify-achievements.js | tail -1`
Expected: Task 1 count **+6** passed, 0 failed.

---

### Task 4: The router — `lounge`, `home`, `closeSwitcher`, close-to-where-you-opened, `LOBBY_LAYOUTS`

**Files:**
- Modify: `js/lobby/lobby-router.js`
- Modify: `js/lobby/lobby-doors.js`
- Modify: `tools/verify-lobby-router.js`

**Interfaces:**
- Consumes: `LobbyRouter` from Task 2.
- Produces: `LobbyRouter.LOBBY_LAYOUTS` = `[{ id, label, ico, screen }]` in switcher order `lounge, shelves, tv, original`; actions `home`, `closeSwitcher`; `workshopClose`/`stickerbookClose` keep the current `view` (a handed-out device on `lounge` → `shelves`); `LobbyDoors.lobbyCreateHost(deps)` passes through an optional `deps.controllerParts` function.

- [ ] **Step 1: Rewrite the two harness blocks whose meaning changes on purpose, and add the new checks**

In `tools/verify-lobby-router.js`:

(a) Delete the line `eq(R.LOBBY_INIT.live, false, '?live is off by default');` (the `live` field is removed — `?live` was sandbox plumbing).

(b) Replace the whole `section('claim 1 — the return path');` block (the `R.LOBBY_VIEWS.forEach(v => { … workshopClose … })` loop and the `absent` check after it) with:

```js
section('claim 1 — the return path (production: close to where you opened)');
// The sandbox only ever opened the Workshop from the lounge, so "close" meant
// "the lounge". Production opens it from four places — every ornament and the
// lounge's prop — and each one expects its own layout back (spec § 4.1).
R.LOBBY_VIEWS.forEach(v => {
  const s = R.lobbyReduce(start({ view: v, room: 'idle', workshop: true }), { t: 'workshopClose' });
  eq(s.view, v, `workshopClose from "${v}" lands back on "${v}"`);
  eq(s.workshop, false, `workshopClose from "${v}" clears the workshop flag`);
  eq(s.switcher, false, `workshopClose from "${v}" re-hides the dock`);
  eq(s.room, v === 'lounge' ? 'running' : 'idle', `workshopClose from "${v}" runs the room only if it is the lounge`);
});
eq(R.lobbyReduce(start({ workshop: true, room: 'absent' }), { t: 'workshopClose' }).room, 'absent',
   'workshopClose does not claim a room that was never built');
```

(c) Before the final summary line, append:

```js
section('production — LOBBY_LAYOUTS');
eq(R.LOBBY_LAYOUTS.map(l => l.id).join(','), 'lounge,shelves,tv,original', 'four layouts, in switcher order');
eq(R.LOBBY_LAYOUTS.find(l => l.id === 'original').screen, 'screen-lobby', 'Original IS the shipped screen-lobby');
eq(R.LOBBY_LAYOUTS.find(l => l.id === 'lounge').label, 'Lounge', 'the room is called the Lounge');
eq(R.LOBBY_LAYOUTS.every(l => typeof l.label === 'string' && l.label && l.ico && /^screen-/.test(l.screen)), true,
   'every layout has a label, an icon and a screen');
eq([...R.LOBBY_VIEWS].sort().join(), R.LOBBY_LAYOUTS.map(l => l.id).sort().join(), 'LOBBY_VIEWS and LOBBY_LAYOUTS name the same four');
eq(R.LOBBY_INIT.view, 'lounge', 'the lobby opens on the Lounge');

section('production — home (every exit from outside the lobby)');
R.LOBBY_VIEWS.forEach(v => {
  const s = R.lobbyReduce(start({ view: v, room: v === 'lounge' ? 'idle' : 'idle', workshop: true, stickerbook: true, switcher: true }), { t: 'home' });
  eq(s.view, v, `home from a game launched in "${v}" lands on "${v}"`);
  eq(s.workshop || s.stickerbook || s.switcher, false, `home from "${v}" closes the Workshop, the book and the dock`);
});
{
  const out = R.lobbyReduce(start({ view: 'lounge', arrival: 'done', room: 'idle' }), { t: 'home' });
  eq(out.view, 'shelves', 'home never lands a handed-out device in the Lounge');
  eq(out.room, 'idle', 'and leaves its room stopped');
  eq(R.lobbyReduce(start({ view: 'lounge', room: 'idle' }), { t: 'home' }).room, 'running', 'home into the Lounge restarts the room');
  eq(R.lobbyReduce(start({ view: 'tv', room: 'idle' }), { t: 'home' }).room, 'idle', 'home into TV leaves the room stopped');
  eq(R.lobbyReduce(start({ view: 'lounge', room: 'absent' }), { t: 'home' }).room, 'absent', 'home does not claim a room that was never built');
}

section('production — closeSwitcher and the one-way rule on every close');
{
  const up = R.lobbyReduce(start(), { t: 'openSwitcher' });
  const down = R.lobbyReduce(up, { t: 'closeSwitcher' });
  eq(down.switcher, false, 'closeSwitcher shuts the dock');
  eq(down.view, up.view, 'and changes nothing else');
  const shut = start();
  eq(R.lobbyReduce(shut, { t: 'closeSwitcher' }), shut, 'closing a shut dock is a no-op');
  const handed = start({ view: 'lounge', arrival: 'done', room: 'idle' });
  eq(R.lobbyReduce(Object.assign({}, handed, { workshop: true }), { t: 'workshopClose' }).view, 'shelves',
     'workshopClose cannot put a handed-out device back in the Lounge');
  eq(R.lobbyReduce(Object.assign({}, handed, { stickerbook: true }), { t: 'stickerbookClose' }).view, 'shelves',
     'nor can stickerbookClose');
  eq(R.lobbyReduce(handed, { t: 'go', view: 'lounge' }), handed, 'nor a switcher pick');
}

section('production — the doors pass the controller parts through');
{
  const noop = () => {};
  const base = { dispatch: noop, openSound: noop, games: GAMES, stickers: {}, design: {}, lampPanels: {}, music: {} };
  eq(H.lobbyCreateHost(base).controllerParts, undefined, 'absent unless supplied');
  const parts = () => null;
  eq(H.lobbyCreateHost(Object.assign({}, base, { controllerParts: parts })).controllerParts, parts, 'passed through when supplied');
}
```

Also add `'home', 'closeSwitcher'` to the array of router action names in the "no router action is unreachable" check (the `['go', 'enterTV', …]` list).

- [ ] **Step 2: Run to see it fail**

Run: `node tools/verify-lobby-router.js | tail -5`
Expected: FAILs for `LOBBY_LAYOUTS` (undefined), `home`, `closeSwitcher`, the close-to-origin checks and `controllerParts`.

- [ ] **Step 3: Implement in `js/lobby/lobby-router.js`**

(a) Rewrite the file header comment to: `lobby-router.js — the pure state machine behind the lobby's four layouts (SW v231). Pure and total: no DOM, no window, no timers, no Date.now, no Math.random — tools/verify-lobby-router.js drives every transition under Node. js/lobby/lobby-host.js owns every effect.`

(b) Replace `const LOBBY_VIEWS = [...]` with:

```js
  /* The four layouts, in the order every switcher shows them. `screen` is what
     showScreen() shows for it. The label is display copy only — the code keys on
     the id, whatever the owner renames "Original" to (spec § 0). */
  const LOBBY_LAYOUTS = [
    { id: 'lounge',   label: 'Lounge',   ico: '✨', screen: 'screen-lounge' },
    { id: 'shelves',  label: 'Shelves',  ico: '🗂️', screen: 'screen-shelves' },
    { id: 'tv',       label: 'TV',       ico: '🖥️', screen: 'screen-tv' },
    { id: 'original', label: 'Original', ico: '▤',  screen: 'screen-lobby' },
  ];
  const LOBBY_VIEWS = LOBBY_LAYOUTS.map(l => l.id);
```

(c) In `LOBBY_INIT`, delete the `live:` line. `view` already reads `'lounge'` after the migration.

(d) Add `'home', 'closeSwitcher'` to `LOBBY_PAGE_ACTIONS`.

(e) Replace the bodies of `workshopClose` and `stickerbookClose`:

```js
      case 'workshopClose':
        s.workshop = false;
        /* Back to the layout it was opened from — the view never changes while
           the Workshop is up. Production opens it from four places; the sandbox
           only ever opened it from the lounge. The one-way rule still holds. */
        s.view = (state.view === 'lounge' && !lounged) ? 'shelves' : state.view;
        s.room = state.room === 'absent' ? 'absent' : (s.view === 'lounge' ? 'running' : 'idle');
        s.switcher = false;
        return s;
```

```js
      case 'stickerbookClose':
        if (!state.stickerbook) return state;
        s.stickerbook = false;
        s.view = (state.view === 'lounge' && !lounged) ? 'shelves' : state.view;
        s.room = state.room === 'absent' ? 'absent' : (s.view === 'lounge' ? 'running' : 'idle');
        s.switcher = false;
        return s;
```

(f) Add two cases before `default:`:

```js
      /* Coming back into the lobby from OUTSIDE it — a game's exit
         (resetToLobby), the Terminal, the gateway. `view` already is the layout
         the player left from: nothing the router sees changes it while a game is
         up. So home only closes what was open, and keeps the one-way rule. */
      case 'home':
        s.workshop = false;
        s.stickerbook = false;
        s.switcher = false;
        s.view = (state.view === 'lounge' && !lounged) ? 'shelves' : state.view;
        s.room = state.room === 'absent' ? 'absent' : (s.view === 'lounge' ? 'running' : 'idle');
        return s;

      case 'closeSwitcher':
        if (!state.switcher) return state;
        s.switcher = false;
        return s;
```

(g) Export: `const api = { LOBBY_LAYOUTS, LOBBY_VIEWS, LOBBY_INIT, LOBBY_PAGE_ACTIONS, lobbyReduce };`

- [ ] **Step 4: Implement in `js/lobby/lobby-doors.js`**

Rewrite the header to `lobby-doors.js — builds the host object js/lounge/lounge-scene.js validates, and holds the one door→destination map. Pure: no DOM, no window, no timers.` Then, after the `if (deps.sfx) host.sfx = deps.sfx;` line, add:

```js
    /* A PROVIDER, not a door or an effect: the Lounge's controller prop calls it
       to borrow the Workshop's painted model (js/controller.js ctlModelParts).
       Absent-not-undefined, same reason as sfx; absent means flat colour. */
    if (deps.controllerParts) host.controllerParts = deps.controllerParts;
```

- [ ] **Step 5: Run to pass**

Run: `node tools/verify-lobby-router.js | tail -1`
Expected: 0 failed. New count = Task 1 − 1 (the `live` line) + the new checks. Record it.

---

### Task 5: `controller.js` — model/renderer split, ornament slots

**Files:**
- Modify: `js/controller.js` — `ctlApplyDesign` (~1411), `ctlEnsureBuilt` (~1421), `ctlEnsureStickerSurface` (~519), `ctlMountLobby` + the keyboard block (~1892–1928), `ctlScheduleIdleNudge` (~1985)
- Modify: `tools/visual-controller-stickers.js` (+2 checks)

**Interfaces:**
- Produces: `ctlEnsureModel() → bool`; `ctlModelParts() → { geo, tex, bumpTex, earTex, earBumpTex, ears } | null`; `ctlMountOrnament(slotId, { returnScreen, onOpen, onReturn }) → bool`; `ctlOrnamentIsLive() → bool`; `ctlMountLobby()` kept as `ctlMountOrnament('lobby-controller', {})`.

- [ ] **Step 1: Write the failing browser checks**

In `tools/visual-controller-stickers.js`, find the 900×1400 `page` block's first `waitForFunction(() => typeof ctlEnsureBuilt === 'function' && ctlEnsureBuilt(), …)` (~line 305). Immediately **before** it, add:

```js
    /* The model/renderer split (lobby production wiring, spec § 7.2): the Lounge
       borrows the painted model on the front door, so painting must not need a
       renderer, and the renderer must then adopt that same model, not build a
       second body. */
    const split = await page.evaluate(() => {
      if (typeof ctlEnsureModel !== 'function') return { missing: true };
      const hadRenderer = typeof ctlRenderer !== 'undefined' && !!ctlRenderer;
      const ok = ctlEnsureModel();
      const parts = ctlModelParts();
      return { ok, hadRenderer, rendererAfter: !!ctlRenderer, geo: !!(parts && parts.geo),
               tex: !!(parts && parts.tex && parts.tex.isTexture), ears: parts ? parts.ears.length : 0 };
    });
    ok(!split.missing && split.ok && !split.rendererAfter && split.geo && split.tex && split.ears === 2,
       'ctlEnsureModel paints the model with NO renderer: ' + JSON.stringify(split));
    const adopted = await page.evaluate(() => { const g = ctlModelParts().geo; ctlEnsureBuilt(); return ctlBody.geometry === g; });
    ok(adopted, 'ctlEnsureBuilt adopts the model ctlEnsureModel built — one buildBody, not two');
```

**Note:** until Task 10 lands, the 900×1400 page boots to `screen-lobby` exactly as today, so these run against unchanged boot behaviour.

- [ ] **Step 2: Run to see them fail**

Run: `node tools/visual-controller-stickers.js 2>&1 | grep -E "FAIL|passed"`
Expected: FAIL on `ctlEnsureModel paints the model…` (`missing: true`) and on the adoption check (throws → reported as FAIL or an error line). If Playwright is absent the harness exits 0 with a notice — then this task's browser checks are deferred to whoever has it; say so in the Task 12 report.

- [ ] **Step 3: Implement the split**

Add near the other renderer globals (`let ctlBuilt = false;`, ~line 318):

```js
/* The model half is built before the renderer half, and can exist without it:
   the Lounge's 3D prop borrows the painted model on the app's front door
   (ctlModelParts), where building a WebGL context just to paint a texture would
   double buildBody — the single most expensive thing this feature does. */
let ctlModelBuilt = false;
```

Replace `ctlEnsureBuilt()` (whole function) with:

```js
/* Everything that needs THREE but not a WebGL context: atlases, the body, plate
   UVs, materials, the ears and their UVs, the controls, and the design repaint.
   Idempotent. The renderer half (ctlEnsureBuilt) adopts exactly this model. */
function ctlEnsureModel() {
  if (ctlModelBuilt) return true;
  if (typeof THREE === 'undefined' || !window.ControllerBody) return false;

  ctlBuildAtlases();

  const geo = ControllerBody.buildBody(THREE, {});
  ctlGeo = geo;                      // the sticker surface needs geo.userData later
  ctlBuildPlateUV(geo);

  ctlShellMat = new THREE.MeshStandardMaterial({ map: ctlTex, roughness: .52, metalness: .06,
                                                 bumpMap: ctlBumpTex, bumpScale: 0.035 });
  ctlBody = new THREE.Mesh(geo, ctlShellMat);
  ctlBody.castShadow = true; ctlBody.receiveShadow = true;

  ctlEarMat = new THREE.MeshStandardMaterial({ map: ctlEarTex, roughness: .52, metalness: .06,
                                               bumpMap: ctlEarBumpTex, bumpScale: 0.035 });
  ctlEars = ControllerBody.buildEars(THREE, ctlEarMat);
  ctlBuildEarUV();                   // buildEars ships default UVs — see the note there

  ctlControls = ControllerBody.buildControls(THREE, geo);

  /* The customisable "buttons" group: both sticks, both stick wells, the whole
     d-pad including its hub, and both shoulders. The four face buttons and
     Select/Start keep their own fixed accent colours and are deliberately NOT
     customisable — same as the prototype. */
  ctlControls.group.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const parentIsDpad = o.parent && o.parent.name === 'D-pad';
    if (o.name === 'L button' || o.name === 'R button' || o.name === 'D-pad' || parentIsDpad
        || / stick$/.test(o.name) || / well$/.test(o.name)) {
      CTL_BUTTON_MATS.add(o.material);
    }
  });

  ctlModelBuilt = true;
  ctlDesign = ctlReadDesign();
  ctlApplyDesign(null);
  return true;
}

/* The painted model's shareable parts. The Lounge builds its OWN meshes and
   materials on these (a room material carries shader patches that must never
   reach the Workshop's render) — it borrows geometry and textures only. */
function ctlModelParts() {
  if (!ctlModelBuilt) return null;
  return { geo: ctlGeo, tex: ctlTex, bumpTex: ctlBumpTex, earTex: ctlEarTex,
           earBumpTex: ctlEarBumpTex, ears: ctlEars.slice() };
}

function ctlEnsureBuilt() {
  if (ctlBuilt) return true;
  if (!ctlEnsureModel()) return false;
  ctlBuildScene();
  ctlRig.add(ctlBody);
  ctlEars.forEach(m => ctlRig.add(m));
  ctlRig.add(ctlControls.group);
  ctlBuilt = true;
  ctlApplyDesign(null);              // repaint now that there is somewhere to render it
  return true;
}
```

In `ctlApplyDesign`, change `if (!ctlBuilt) return;` to `if (!ctlModelBuilt) return;`. In `ctlEnsureStickerSurface`, change `if (!ctlBuilt || !ctlGeo || !window.StickerSurface) return false;` to `if (!ctlModelBuilt || !ctlGeo || !window.StickerSurface) return false;`. (`ctlWake`, `ctlResize`, `ctlTeardown` keep `ctlBuilt` — they are renderer business.)

- [ ] **Step 4: Implement the ornament slots**

Replace `ctlMountLobby()` and the keyboard-equivalence block after it with:

```js
// ── The ornament — the one controller canvas, moved between the lobby layouts ──
/* Three layouts carry an ornament slot (Original's #lobby-controller, Shelves'
   #shelves-controller, TV's #tv-controller); the Lounge has its own 3D prop.
   There is ONE renderer, re-parented by ctlMount, so a layout switch costs a
   DOM move, not a second WebGL context. The slot is remembered by ID and
   resolved at use, because Shelves re-renders its markup on every state change.

   Deferred one frame past first paint when the model is not built yet —
   buildBody is the single most expensive thing this feature does. A deferred
   attach that lands after the player moved on re-reads the CURRENT slot, and
   bails if that slot is not on screen: a stale callback must never pull the
   canvas somewhere the player has left. */
let ctlOrnamentSlot = null;
let ctlOrnamentOpts = {};

function ctlMountOrnament(slotId, opts) {
  ctlOrnamentSlot = slotId;
  ctlOrnamentOpts = opts || {};
  const attach = () => {
    const el = document.getElementById(ctlOrnamentSlot);
    if (!el || !el.getClientRects().length) return false;
    if (!ctlEnsureBuilt()) return false;
    const o = ctlOrnamentOpts;
    ctlPressEnabled = false;         // an ornament's buttons are scenery
    ctlOnPress = null;
    ctlOnTap = () => {
      playLaunch();
      if (typeof o.onOpen === 'function') o.onOpen();
      ctlOpenWorkshop({ returnScreen: o.returnScreen, onReturn: o.onReturn });
    };
    /* An ornament is never zoomed — and the Konami/gateway return reaches here
       through the lobby router without ever touching ctlCloseWorkshop. */
    ctlZoom = 1;
    ctlMount(el, { floor: false });  // no headroom below a slot for the contact shadow
    ctlBindPointer(el);
    ctlScheduleIdleNudge();
    return true;
  };
  if (ctlBuilt) return attach();
  if (window.requestIdleCallback) requestIdleCallback(attach, { timeout: 1200 });
  else setTimeout(attach, 0);
  return true;
}

/* Kept for ctlCloseWorkshop's default return (DD-18) — every production opener
   passes its own onReturn, so this is the no-opener fallback only. */
function ctlMountLobby() { return ctlMountOrnament('lobby-controller', {}); }

/* Is an ornament on screen right now? The idle nudge's gate. Owned here so the
   nudge needs nothing from the lobby's files: the canvas is in the current slot
   and that slot has a box — false during a game, the Workshop, or the Lounge. */
function ctlOrnamentIsLive() {
  return !!ctlMountEl && !!ctlOrnamentSlot && ctlMountEl.id === ctlOrnamentSlot
    && ctlMountEl.isConnected && ctlMountEl.getClientRects().length > 0;
}

// Keyboard equivalence for the tap — every slot is role="button" tabindex="0".
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (document.activeElement && document.activeElement === ctlMountEl && ctlOrnamentIsLive() && ctlOnTap) {
    e.preventDefault();
    ctlOnTap();
  }
});
```

In `ctlScheduleIdleNudge`'s `fire`, replace these four lines:

```js
    const lobbyEl = document.getElementById('lobby-controller');
    const screenLobby = document.getElementById('screen-lobby');
    if (ctlMountEl !== lobbyEl) return;              // Workshop mount, or not mounted
    if (!screenLobby || screenLobby.style.display === 'none') return;  // a game is on screen
```

with:

```js
    if (!ctlOrnamentIsLive()) return;                // the Workshop, a game, the Lounge, or nothing mounted
```

Update that function's header comment: "a game in progress (screen-lobby hidden)" → "a game in progress (no ornament slot on screen)".

**Leave `document.addEventListener('DOMContentLoaded', ctlMountLobby);` in place for now** — Task 10 removes it when `lobbyBoot()` takes over. That keeps this task shippable on its own.

- [ ] **Step 5: Run to pass**

```bash
node tools/verify-controller-body.js | tail -1
node tools/verify-controller-state.js | tail -1
node tools/verify-controller-stickers.js | tail -1
node tools/visual-controller-stickers.js 2>&1 | tail -1
```

Expected: the three Node harnesses at their Task 1 counts; the visual harness at Task 1 count **+2**, 0 failed.

---

### Task 6: The Lounge's controller prop borrows the painted model

**Files:**
- Modify: `js/lounge/lounge-props.js` — `louBuildController` and its `LOU_BUILDERS.controller` line (~144–169)
- Modify: `js/lounge/lounge-scene.js` — the `ctx` object in `louMount` (~233), host validation (~22–72), `dispose()` (~580)
- Modify: `tools/verify-lounge-props.js`

**Interfaces:**
- Consumes: `ctlModelParts()` shape from Task 5 (as `host.controllerParts()`), `LobbyDoors` passthrough from Task 4.
- Produces: `LOU_PROVIDER_FUNCS = ['controllerParts']`; meshes built on borrowed geometry carry `userData.louSharedGeometry = true`; materials whose maps are borrowed carry `userData.louSharedMaps = true`; `dispose()` skips both.

- [ ] **Step 1: Write the failing test**

Append to `tools/verify-lounge-props.js` before the summary line. It already has, at top level, `THREE`, `CB` (`global.window.ControllerBody`, line ~27), `lib` (`LouLib.louCreateLib(…)`, line ~43), `LouLib`, `LouProps`, `path`, `ROOT` and `section/ok/eq` — the block below uses those names as they are:

```js
section('production — the controller prop borrows the Workshop\'s painted model (spec § 7.2)');
{
  const geo = CB.buildBody(THREE, {});
  const tex = new THREE.Texture(), bumpTex = new THREE.Texture(), earTex = new THREE.Texture(), earBumpTex = new THREE.Texture();
  const ears = CB.buildEars(THREE, new THREE.MeshStandardMaterial());
  const parts = { geo, tex, bumpTex, earTex, earBumpTex, ears };
  const design = { shell: '#123456', plate: '#654321', ears: '#abcdef', buttons: '#fedcba' };
  const g = LouProps.LOU_BUILDERS.controller({ lib, design, ControllerBody: CB, controllerParts: () => parts });
  let body = null; const earMeshes = [];
  g.traverse(o => { if (!o.isMesh) return; if (o.name === 'body') body = o; if (o.geometry === ears[0].geometry || o.geometry === ears[1].geometry) earMeshes.push(o); });
  ok(body && body.geometry === geo, 'the body is built on the Workshop\'s geometry, not a second buildBody');
  ok(body && body.material.map === tex && body.material.bumpMap === bumpTex, 'and wears its painted atlas and bump map');
  eq(body && body.material.color.getHexString(), 'ffffff', 'with a white base colour, so the atlas is not tinted');
  eq(earMeshes.length, 2, 'both ears are built on the Workshop\'s ear geometry (its UVs)');
  ok(earMeshes.every(m => m.material.map === earTex), 'and wear its ear atlas');
  ok(body.userData.louSharedGeometry === true && body.material.userData.louSharedMaps === true, 'borrowed things are tagged for dispose to skip');
  const n = LouLib.louApplyDesign(g, { shell: '#000000', ears: '#000000' });
  eq(body.material.color.getHexString(), 'ffffff', 'a design change does not tint the painted shell (the atlas carries it)');
  const flat = LouProps.LOU_BUILDERS.controller({ lib, design, ControllerBody: CB, controllerParts: () => null });
  let flatBody = null; flat.traverse(o => { if (o.name === 'body') flatBody = o; });
  ok(flatBody && flatBody.geometry !== geo && flatBody.material.map == null, 'no parts → today\'s flat-colour build');
  const none = LouProps.LOU_BUILDERS.controller({ lib, design, ControllerBody: CB });
  ok(!!none, 'no provider at all → the flat build too');
}

section('production — the scene validates the provider, and survives an empty world');
{
  const S = require(path.join(ROOT, 'js/lounge/lounge-scene.js'));
  ok(Array.isArray(S.LOU_PROVIDER_FUNCS) && S.LOU_PROVIDER_FUNCS.includes('controllerParts'), 'controllerParts is a named provider');
  let threw = false;
  try { S.louValidateHost(Object.assign({}, hostFixture(), { controllerParts: 42 })); } catch (_) { threw = true; }
  ok(threw, 'a non-function controllerParts is refused');
}
```

`hostFixture()` — if the file already builds a valid host object for `louValidateHost` tests, wrap that existing object in `const hostFixture = () => ({ … })`; otherwise define it with every key in `S.LOU_REQUIRED` (functions for `S.LOU_FUNCS`, `games: GAMES`, `{}` for the rest).

Also add the **empty-world** check (Review Focus 1): search the file for the call that builds every prop (`LouProps.louBuildAll(`); duplicate it once with `stickers: { base: 'data/stickers/', list: [] }` and `lampPanels: { base: 'data/lamp/', manifest: { panels: [] } }` and assert:

```js
ok(Object.keys(emptyBuilt).length === Object.keys(fullBuilt).length, 'an empty sticker list and an empty lamp manifest still build every prop');
```

- [ ] **Step 2: Run to see it fail**

Run: `node tools/verify-lounge-props.js | tail -8`
Expected: FAILs — body geometry is not `parts.geo`, `LOU_PROVIDER_FUNCS` undefined, no tags.

- [ ] **Step 3: Implement the prop**

In `js/lounge/lounge-props.js`, replace `louBuildController` and its builder line with:

```js
  /* The player's controller. With the Workshop's painted model available
     (host.controllerParts → js/controller.js ctlModelParts) it wears the real
     atlas — stickers and the plate outline — on the Workshop's own geometry, so
     the app pays ONE buildBody. Materials stay the room's own: a room material
     carries shader patches (contact shade, grade) that must never reach the
     Workshop's render, so only geometry and textures are borrowed, and both are
     tagged so the scene's dispose() leaves them alone. No parts → flat colour,
     exactly as before. Never monochrome. */
  function louBuildController(lib, design, CB, getParts) {
    const { THREE } = lib; const g = new THREE.Group(); louTag(g, 'controller');
    let parts = null;
    try { parts = typeof getParts === 'function' ? getParts() : null; } catch (_) { parts = null; }
    const painted = (texMap, bumpMap) => {
      const m = lib.role('painted', '#ffffff', { map: texMap, bumpMap, bumpScale: 0.035 });
      m.userData.louSharedMaps = true;   // role 'painted' is in no design, so louApplyDesign leaves it white
      return m;
    };
    const geo = parts ? parts.geo : CB.buildBody(THREE, {});
    const body = new THREE.Mesh(geo, parts ? painted(parts.tex, parts.bumpTex) : lib.role('shell', design.shell));
    body.name = 'body'; body.castShadow = body.receiveShadow = true;
    if (parts) body.userData.louSharedGeometry = true;
    const inner = new THREE.Group(); inner.name = 'rig'; inner.add(body);
    if (parts) {
      parts.ears.forEach(src => {
        const e = new THREE.Mesh(src.geometry, painted(parts.earTex, parts.earBumpTex));
        e.position.copy(src.position); e.quaternion.copy(src.quaternion); e.scale.copy(src.scale);
        e.castShadow = e.receiveShadow = true; e.userData.louSharedGeometry = true;
        inner.add(e);
      });
    } else {
      CB.buildEars(THREE, lib.role('ears', design.ears)).forEach(m => inner.add(m));
    }
    const controls = CB.buildControls(THREE, geo); inner.add(controls.group);
    controls.group.traverse(o => {
      if (!o.isMesh || !o.material) return; o.castShadow = true;
      const pd = o.parent && o.parent.name === 'D-pad';
      if (o.name === 'L button' || o.name === 'R button' || o.name === 'D-pad' || pd || / stick$/.test(o.name) || / well$/.test(o.name)) {
        o.material = o.material.clone(); o.material.userData.louRole = 'buttons'; o.material.color.set(design.buttons);
      }
    });
    /* Body units are ~4.6 wide; 0.036 makes it ~16.5 cm. Face up, leaning toward the camera. */
    inner.scale.setScalar(0.036); inner.rotation.x = -Math.PI / 2 + 0.28;
    inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(inner); inner.position.y = -bb.min.y;   // rest the lowest point on the group origin
    g.add(inner);
    g.userData.api = { tick() { return false; } };
    return g;
  }
  LOU_BUILDERS.controller = (ctx) => louBuildController(ctx.lib, ctx.design, ctx.ControllerBody, ctx.controllerParts);
```

**Check before moving on:** `CB.buildControls(THREE, geo)` on borrowed geometry must not mutate `geo`. Run `grep -n "function buildControls" -A15 js/lib/controller-body.js` and confirm it only reads `geo.userData`/`geo.attributes`. If it writes to `geo`, pass `CB.buildBody` output for the controls only in the parts branch — and say so in the impl-notes.

- [ ] **Step 4: Implement the scene side**

In `js/lounge/lounge-scene.js`:

(a) After `const LOU_EFFECT_FUNCS = ['sfx'];` add:

```js
  /* Optional host PROVIDERS — a function the scene calls for data, not a door
     and not a named moment. controllerParts lends the Workshop's painted model
     to the controller prop (spec § 7.2). Absent means flat colour. */
  const LOU_PROVIDER_FUNCS = ['controllerParts'];
```

(b) In `louValidateHost`, change `LOU_OPTIONAL_FUNCS.concat(LOU_EFFECT_FUNCS)` to `LOU_OPTIONAL_FUNCS.concat(LOU_EFFECT_FUNCS, LOU_PROVIDER_FUNCS)`.

(c) In the `ctx` object in `louMount`, add `controllerParts: host.controllerParts,`.

(d) In `dispose()`, replace the `scene.traverse(…)` line with:

```js
        /* Borrowed geometry and textures belong to js/controller.js — disposing
           them here would free the ornament's GPU copies too (spec § 7.2). */
        scene.traverse(o => {
          if (o.geometry && !o.userData.louSharedGeometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
            if (m.map && !(m.userData && m.userData.louSharedMaps)) m.map.dispose();
            m.dispose();
          });
        });
```

(e) Add `LOU_PROVIDER_FUNCS` to the exported `api` object.

- [ ] **Step 5: Run to pass**

```bash
node tools/verify-lounge-props.js | tail -1
node tools/visual-lounge.js | tail -1
```

Expected: 0 failed. verify-lounge-props = its Task 2 count + the new checks (record it); visual-lounge unchanged (the fixture supplies no provider, so it builds flat — the path Task 1 measured).

---

### Task 7: The layouts go production — § 6.1 of the spec, control by control

**Files:**
- Modify: `js/lobby/lobby.js`
- Modify: `js/lobby/tv.js`

**Interfaces:**
- Consumes (at call time only — these are defined in Task 10): `lobbyGo(id)`, `lobbyLaunch(gameId)`, `lobbyOffered(id)`, `lobbyIsUp(view)`, `lobbyAfterLayoutRender()`; `LobbyRouter.LOBBY_LAYOUTS`; `openSoundOverlay`, `smArcadeUnlocked`, `smOpenArcadeMenu`.
- Produces: slot ids `shelves-controller`, `tv-controller`; `lbRender()`, `lbMountTVFull()`, `lbTvEligible()`, `lbSet()` with no boot side effects.

- [ ] **Step 1: Pin the TV harness count before editing**

Run: `node tools/verify-tv.js | tail -1` — it must equal Task 2's number, and must again at Step 8 (this task changes DOM-building code only, never the pure half it tests).

- [ ] **Step 2: `lobby.js` — header, asset paths, the switch**

(a) Replace the file header (first 8 lines) with:

```js
// ═══════════════════════════════════════════════════════════════════════════
// lobby.js — the Shelves layout, the TV layout's size gate + hand-off card, and
// the lb* helpers both layouts share (SW v231). Global symbols, no fetch. Reads
// GAMES / SHELVES (lobby-games.js). State is lbState; every render is a pure
// function of it. Routing is NOT here: every layout change goes through
// lobbyGo(), every game launch through lobbyLaunch() (js/lobby/lobby-host.js).
// ═══════════════════════════════════════════════════════════════════════════
```

(b) Replace every `../../data/` with `data/` and every `../../assets/` with `assets/` in this file.

(c) Delete the `const LB_VIEWS = [ … ];` block. In `lbRenderDock`, replace the `for (const v of LB_VIEWS) { … }` loop with:

```js
  for (const v of LobbyRouter.LOBBY_LAYOUTS) {
    if (typeof lobbyOffered === 'function' && !lobbyOffered(v.id)) continue;   // absent, not dimmed
    const b = lbEl('button', 'lb-seg', `<span class="lb-seg-ico" aria-hidden="true">${v.ico}</span><span class="lb-seg-lbl">${v.label}</span>`);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(v.id === 'shelves'));
    b.setAttribute('aria-label', v.label);
    b.addEventListener('click', () => lobbyGo(v.id));
    sw.appendChild(b);
  }
```

- [ ] **Step 3: `lobby.js` — the dock icons**

In `lbRenderDock`, replace the `list` array and its loop with:

```js
  /* Production icons (spec § 6.1). Skins / Word Packs are gone: the pack/skin
     terminal costs a fresh Konami (secret-mode.js), so a lobby icon for it would
     lie. The trophy waits for the stickerbook's own layout icon (deferred). The
     arcade follows Original's header tile: shown once smArcadeUnlocked. */
  const arcade = typeof smArcadeUnlocked !== 'undefined' && smArcadeUnlocked;
  const list = [
    { ico: '🔊', label: 'Sound', cls: 'lb-icon-sound', on: () => openSoundOverlay() },
  ];
  if (arcade) list.push({ ico: '🕹️', label: 'Arcade', on: () => smOpenArcadeMenu() });
  for (const it of list) {
    const b = lbEl('button', 'lb-icon lb-press ' + (it.cls || ''), it.ico);
    b.setAttribute('aria-label', it.label);
    b.title = it.label;
    b.addEventListener('click', it.on);
    icons.appendChild(b);
  }
```

Then delete `lbState.unlocked` from the `lbState` object.

- [ ] **Step 4: `lobby.js` — the ornament slot, the profile popover, the body, Play**

(a) In `lbRenderBrand`, replace the `<button class="lb-you-controller lb-press" id="lb-you-controller" …>…</button>` element with:

```html
      <div class="lb-you-controller">
        <span class="lb-you-mount ctl-ornament" id="shelves-controller" role="button" tabindex="0"
          aria-label="Your controller — tap to customise"></span>
      </div>
```

and delete the `row.querySelector('#lb-you-controller').addEventListener(…)` line (the ornament's own tap opens the Workshop).

(b) In `lbRenderProfilePop`, delete the `<div class="lb-you-pop-stats">…</div>` block and the `<p class="lb-you-pop-note">…</p>` line. Delete `LB_STAT_PLACEHOLDER` and the comment above it.

(c) Replace `lbRenderBody` with:

```js
function lbRenderBody() {
  const body = lbEl('div', 'lb-body');
  body.dataset.view = 'shelves';
  if (lbState.folder) body.appendChild(lbRenderFolder());
  else {
    body.appendChild(lbEl('p', 'lb-tagline', 'What are we playing today?'));
    body.appendChild(lbRenderWho());
    body.appendChild(lbRenderShelves());
  }
  body.style.display = 'flex'; body.style.flexDirection = 'column'; body.style.gap = '14px';
  return body;
}
```

(d) In `lbRenderSheet`, replace the `#lb-play` listener with:

```js
  sheet.querySelector('#lb-play').addEventListener('click', () => lobbyLaunch(g.id));
```

- [ ] **Step 5: `lobby.js` — delete the sandbox review frames, keep the hand-off card**

Delete these functions/constants entirely: `lbRenderOriginal`, `LB_TV_NAMES`, `lbTvGame`, `lbTvSeed`, `lbTvPlayers`, `lbTvStatus`, `lbRenderTV`, `lbRenderTVHost`, `lbMountTV`, and the `lbBoot` IIFE at the end of the file. Keep `lbRenderTVHandoff`, `LB_TV_MIN_W/H`, `lbTvEligible`, `lbMountTVFull`.

In `lbRenderTVHandoff`, change the back button's listener to `() => lobbyGo('shelves')`.

Replace `lbMountTVFull` with:

```js
/* TV fills #tv-app. Below its floor (a window shrunk while TV is up — every
   switcher already hides TV below it) the hand-off card stands in, and its
   button goes to Shelves. */
function lbMountTVFull() {
  const root = document.getElementById('tv-app');
  if (!root) return;
  if (!lbTvEligible()) {
    tvDrop(root);
    root.innerHTML = '';
    const gate = lbEl('div', 'lb-tv lb-tv-full-gate');
    gate.appendChild(lbRenderTVHandoff());
    root.appendChild(gate);
    return;
  }
  if (root.querySelector('.lb-tv-full-gate')) root.innerHTML = '';   // back above the floor: drop the card
  tvMount(root, 'lb-tv-full');
}
```

Replace the tail of `lbSet` (the `lbRender(); lbMountTV(); lbMountTVFull();` lines) with:

```js
  lbRender();
  if (typeof lobbyIsUp === 'function' && lobbyIsUp('tv')) lbMountTVFull();
  /* lbRender replaced Shelves' markup, slot included — the host puts the
     ornament back into whichever layout is up. */
  if (typeof lobbyAfterLayoutRender === 'function') lobbyAfterLayoutRender();
```

Then run: `grep -nE "lbRenderOriginal|lbRenderTVHost|lbMountTV\(|LB_TV_NAMES|lbTvSeed|lbTvPlayers|lbTvStatus|lbTvGame|LB_VIEWS|tvHost|unlocked|LB_STAT_PLACEHOLDER|console.log|sylly:play" js/lobby/*.js`
Expected: no output. Any hit is a dangling reference — remove or route it.

- [ ] **Step 6: `tv.js` — header, paths, the mode buttons, the slot, Play**

(a) Header: replace the first comment block with `// tv.js — the TV layout (SW v231). Was the sandbox's lounge.js: it was called "the Lounge" until the 3D room took that name (owner, 25 Sep 2026). tv* functions, TV_* constants, TV_STATE. The pure half at the top is Node-tested by tools/verify-tv.js.` Then `grep -n "Lounge" js/lobby/tv.js` and, in comments only, change "the Lounge" → "TV mode" where it means this layout.

(b) Replace every `../../data/` with `data/`.

(c) In the header builder, replace the `for (const v of LB_VIEWS) { … }` mode-button loop with:

```js
  for (const v of LobbyRouter.LOBBY_LAYOUTS) {
    const on = v.id === 'tv';
    if (!on && typeof lobbyOffered === 'function' && !lobbyOffered(v.id)) continue;
    const b = document.createElement('button');
    b.className = 'lb-lg-mode' + (on ? ' is-on' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(on));
    b.title = v.label;
    b.setAttribute('aria-label', v.label);
    b.innerHTML = `<span class="lb-lg-mode-ico" aria-hidden="true">${v.ico}</span>${on ? v.label : ''}`;
    if (!on) b.addEventListener('click', () => lobbyGo(v.id));
    modes.appendChild(b);
  }
```

(d) In the left column's `innerHTML` (the `<img class="lb-lg-ctl" …>` + `<span class="lb-lg-ctl-svg" hidden>…</span>` pair), replace both with:

```html
    <span class="lb-lg-ctl ctl-ornament" id="tv-controller" role="button" tabindex="0" aria-label="Your controller — tap to customise"></span>
```

and delete any `onerror`/fallback code that toggled `.lb-lg-ctl-svg`.

(e) Replace the `.lb-lg-play` listener with `() => lobbyLaunch(g.id)`.

Then run: `grep -nE "LB_VIEWS|controller\.png|lbControllerSVG|console\.log|sylly:play|location\.href" js/lobby/tv.js js/lobby/lobby.js`
Expected: no output except the `lbControllerSVG` **definition** in lobby.js if nothing else uses it — in that case delete the definition too (and re-grep).

- [ ] **Step 7: The TV instance must stop when TV is not up**

Confirm `tvDrop` still cancels `inst.raf`, `inst.spinRaf`, `inst.clock`, `inst.snapT`, `inst.animT` (it is the renamed `lgDrop`). Task 10's host calls `tvDrop(document.getElementById('tv-app'))` whenever it presents any other layout — that is the Timer Lifecycle requirement for TV's drift RAF and its clock interval.

- [ ] **Step 8: Re-run**

Run: `node tools/verify-tv.js | tail -1` — must equal Step 1's count.

---

### Task 8: Markup and wiring — the screens exist, the app still boots as today

**Files:**
- Create: `src/screens/lobby.html`
- Modify: `src/manifest.txt`, `src/screens/_shell.html`, `src/screens/_head.html`, `src/screens/_scripts-3.html`, `js/engine.js:24` (`allScreens`)
- Regenerate: `index.html`

- [ ] **Step 1: Create `src/screens/lobby.html`**

```html
  <!-- ═══════════════════════════════════════════════════════════════
       LOBBY LAYOUTS (SW v231)
       Screens : #screen-lounge, #screen-tv, #screen-shelves
                 (the fourth layout, Original, is #screen-lobby in _shell.html)
       Overlays: #lobby-switcher-overlay, #stickerbook-overlay
       Ref     : js/lobby/lobby-host.js (every effect), js/lobby/lobby-router.js (the rules)
       Visibility is showScreen()'s inline style.display — never `hidden` (BUG-19).
  ════════════════════════════════════════════════════════════════ -->
  <section id="screen-lounge" style="display:none">
    <div id="lou-stage">
      <canvas id="lou-canvas" tabindex="0" aria-label="Little Sylly's lounge. Tab through the room, Enter to use a thing."></canvas>
      <div id="lou-vignette"></div>
      <div id="lou-hud">
        <h1 id="lou-heading">Little Sylly's Lounge</h1>
        <div id="lou-status" role="status" aria-live="polite"></div>
        <div id="lou-focus"></div>
      </div>
      <div id="lou-fade"></div>
    </div>
  </section>

  <section id="screen-tv" style="display:none"><div id="tv-app"></div></section>

  <section id="screen-shelves" style="display:none"><div id="shelves-canvas"></div></section>

  <!-- The dock (DD-17): summoned, never automatic — the Lounge's channel dial and
       Original's layout button open it. Closed by the router's `home` and `closeSwitcher`. -->
  <div id="lobby-switcher-overlay" style="display:none"
    class="fixed inset-0 z-[90] overlay-modal-backdrop flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-stone-300">
      <h3 class="text-lg font-bold text-stone-800">Pick a layout</h3>
      <div id="lobby-switcher-list" class="grid grid-cols-2 gap-3"></div>
      <button id="btn-lobby-switcher-close"
        class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-transform duration-100">Not now</button>
    </div>
  </div>

  <!-- The stickerbook (the binder's door). stickerbook.js owns this node and
       toggles its own `hidden`, guarded by #stickerbook-overlay[hidden]{display:none!important}
       in css/lobby.css. Do NOT add it to resetToLobby()'s style.display list — an
       inline display:none would outlive the next open (spec § 3). -->
  <div id="stickerbook-overlay" hidden></div>
```

- [ ] **Step 2: Register the partial and the screens**

In `src/manifest.txt`, add a line `lobby.html` directly after `_shell.html`.

In `js/engine.js`, change the first `allScreens` line to:

```js
  'screen-lobby', 'screen-lounge', 'screen-tv', 'screen-shelves',
  'screen-who-first', 'screen-workshop', 'screen-menu', 'screen-setup',
```

- [ ] **Step 3: Original's layout button, and hide Original in markup**

In `src/screens/_shell.html`:

(a) Change `<section id="screen-lobby" class="…">` to `<section id="screen-lobby" style="display:none" class="…">` (same classes). Until Task 10, the `DOMContentLoaded` boot below shows it — Step 6 adds that.

(b) Inside `#lobby-header-icons`, before the `btn-open-sound` button, add:

```html
      <button id="btn-lobby-layout" class="text-xl text-stone-400 active:scale-90 transition-transform duration-100 min-h-11 min-w-11" aria-label="Change layout">🗂️</button>
```

- [ ] **Step 4: Stylesheet and scripts**

In `src/screens/_head.html`, after `<link rel="stylesheet" href="css/styles.css" />` add `<link rel="stylesheet" href="css/lobby.css" />`.

In `src/screens/_scripts-3.html`, after `<script src="js/controller.js"></script>` add:

```html
  <script src="js/lounge/lounge-lib.js"></script>
  <script src="js/lounge/lounge-room.js"></script>
  <script src="js/lounge/lounge-props.js"></script>
  <script src="js/lounge/lounge-scene.js"></script>
  <script src="js/lounge/lounge-sfx.js"></script>
  <script src="js/lobby/lobby-games.js"></script>
  <script src="js/lobby/lobby.js"></script>
  <script src="js/lobby/tv.js"></script>
  <script src="js/lobby/achievements.js"></script>
  <script src="js/lobby/stickerbook.js"></script>
  <script src="js/lobby/lobby-router.js"></script>
  <script src="js/lobby/lobby-doors.js"></script>
```

(`lobby-host.js` is added in Task 10, when it exists.)

- [ ] **Step 5: Keep today's boot until Task 10**

Because Step 3(a) hid `screen-lobby` in markup, add a temporary line at the end of `js/app.js`:

```js
// TEMPORARY (Task 8 → Task 10): shows Original until lobbyBoot() exists.
document.addEventListener('DOMContentLoaded', () => showScreen('screen-lobby'));
```

- [ ] **Step 6: Build and verify**

```bash
node tools/build-index.js
node tools/verify-build-fresh.js
node tools/verify-mp-configs.js | tail -1
node tools/visual-controller-stickers.js 2>&1 | tail -1
```

Expected: build fresh (1/1), mp-configs at its Task 1 count, visual-controller-stickers at its Task 5 count — the app still boots to Original with the new scripts loaded and nothing throwing (the harness collects `pageerror`s; a load-time error in any new file fails it).

---

### Task 9: `tools/visual-lobby.js` — the production browser harness, written first

**Files:**
- Create: `tools/visual-lobby.js`

**Interfaces:**
- Consumes (from Task 10): `lobbyState`, `lobbyScene`, `lobbyBook`, `lobbyGo`, `lobbyOffered`, `lobbyDispatch`, `lobbyButtonFor`, `window.lobbyReady`, `window.louDebug` (under `?lobbydebug`); from Task 5: `ctlOnTap`, `ctlRenderer`, `ctlOrnamentIsLive`, `ctlTex`, `ctlRotY`; from Task 7: `lbSet`, `lbGame`, `tvSelect`.

- [ ] **Step 1: Write the harness**

Create `tools/visual-lobby.js`:

```js
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
  const open = async (viewport, extra = {}) => {
    const ctx = await browser.newContext(Object.assign({ viewport, serviceWorkers: 'block' }, extra));
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
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

      section('7 — the idle nudge runs in every ornament layout');
      for (const layout of ['shelves', 'tv', 'original']) {
        await page.evaluate(v => lobbyGo(v), layout); await settle(page, 500);
        const r0 = await page.evaluate(() => ctlRotY); await settle(page, 5600);
        ok(await page.evaluate(r => ctlRotY !== r, r0), `${layout}: the ornament nudges itself`);
      }

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
      await page.evaluate(() => lobbyScene.activate('tv-screen')); await settle(page, 1400);   // push-in + fade, then enterTV
      ok(await onlyLayout(page, 'tv'), 'the telly screen door leads to TV');
      await page.evaluate(() => lobbyGo('lounge')); await settle(page, 500);
      ok(await page.evaluate(() => getComputedStyle(document.getElementById('lou-fade')).opacity) === '0', 'the fade is cleared on return — the room is visible');

      section('13 — resizing below a layout\'s floor');
      await page.evaluate(() => lobbyGo('tv')); await settle(page, 300);
      await page.setViewportSize({ width: 700, height: 800 }); await settle(page, 400);
      ok(await shown(page, 'lb-tv-handoff-back'), 'TV below its floor shows the hand-off card');
      await page.click('#lb-tv-handoff-back'); await settle(page, 400);
      ok(await onlyLayout(page, 'shelves'), 'and its button goes to Shelves');
      ok(await page.evaluate(() => !lobbyOffered('tv')), 'TV is not offered below its floor');
      await ctx.close();
    }

    section('2 — a phone plays the arrival beat, lands in Shelves, and cannot go back');
    for (const reduced of [false, true]) {
      const { ctx, page } = await open({ width: 390, height: 844 }, reduced ? { reducedMotion: 'reduce' } : {});
      await ctx.addInitScript(() => {
        window.__mats = new Set();
        const tick = () => {
          if (window.louDebug) window.__mats.add(window.louDebug.cameraMatrix().map(v => v.toFixed(4)).join(','));
          if (!(typeof lobbyState !== 'undefined' && lobbyState.view === 'shelves')) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.goto(base);
      await page.waitForFunction(() => typeof lobbyState !== 'undefined' && lobbyState.view === 'shelves', null, { timeout: 30000 });
      const n = await page.evaluate(() => window.__mats.size);
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
      const { ctx, page } = await open({ width: 1280, height: 800 });
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

    ok(errs.length === 0, 'no page errors on any device' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  } catch (e) {
    fail++; console.log('  FAIL harness threw: ' + (e && e.stack || e));
  } finally {
    await browser.close(); srv.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/visual-lobby.js 2>&1 | tail -5`
Expected: FAIL — `lobbyReady` never set (the host does not exist yet), so section 1 times out and the harness reports the throw. That is the red this task exists to produce.

---

### Task 10: `lobby-host.js`, the four seam sites, boot — make Task 9 pass

**Files:**
- Create: `js/lobby/lobby-host.js`
- Modify: `src/screens/_scripts-3.html` (one script tag), `js/app.js` (boot), `js/engine.js:889` (`resetToLobby`), `js/secret-mode.js:1115` and `:1131`, `js/controller.js` (remove the `DOMContentLoaded` line), `tools/visual-controller-stickers.js` (slot tolerance)

**Interfaces:**
- Produces (globals): `lobbyBoot()`, `lobbyShow()`, `lobbyGo(id)`, `lobbyLaunch(gameId) → bool`, `lobbyButtonFor(gameId) → Element|null`, `lobbyOffered(id) → bool`, `lobbyIsUp(view) → bool`, `lobbyAfterLayoutRender()`, `lobbyDispatch(action)`; state `lobbyState`, `lobbyScene`, `lobbyBook`; `window.lobbyReady`.

- [ ] **Step 1: Write `js/lobby/lobby-host.js`**

```js
// ═══════════════════════════════════════════════════════════════════════════
// lobby-host.js — every effect the lobby's four layouts have (SW v231).
// The rules live in lobby-router.js (pure, tools/verify-lobby-router.js); this
// file only makes them true on screen.
//
// THE SEAM: lobbyShow() is the ONLY way into the lobby from anywhere else in
// the app — resetToLobby() (all 20 games' exits), both secret-mode.js returns.
// Nothing outside js/lobby/ may showScreen() a layout's screen (spec § 4).
//
// Depends on: engine.js (showScreen, openSoundOverlay, playLaunch, isMuted,
// sfxEnabled, Music), controller.js (ctlMountOrnament, ctlOpenWorkshop,
// ctlEnsureModel, ctlModelParts, ctlReadDesign, ctlReducedMotion),
// js/lounge/* (LouScene, LouSfx), js/lobby/* (GAMES, lb*, tv*, Achievements,
// Stickerbook, LobbyRouter, LobbyDoors).
// ═══════════════════════════════════════════════════════════════════════════

/* Three lobby buttons predate the short ids (spec § 6). Every other game's is btn-[id]. */
const LOBBY_BTN_IDS = { li5: 'btn-dstw', gm: 'btn-great-minds', ss: 'btn-sylly-signals' };
const LOBBY_SLOTS = { shelves: 'shelves-controller', tv: 'tv-controller', original: 'lobby-controller' };
/* Both runtime-cached (sw.js): manifest network-first, images cache-first. */
const LOBBY_DATA = { stickers: 'data/stickers/', lamp: 'data/lamp/' };
const LOBBY_SAY_MS = 4000;

let lobbyState = Object.assign({}, LobbyRouter.LOBBY_INIT);
let lobbyScene = null;          // the Lounge's scene api, once mounted
let lobbyRoomTier = null;       // 'lounge' | 'arrival' — which tier the mounted room was built FOR
let lobbyHost = null;           // the object lounge-scene.js validates; null until content loads
let lobbyBook = null;           // the stickerbook's book; null when the sticker manifest never arrived
let lobbySb = null;             // the stickerbook's DOM, mounted on first open
let lobbySfx = null;
let lobbyWebgl = false, lobbyReducedData = false, lobbyDebug = false, lobbyLastOk = null;
let lobbySayTimer = null;

function lobbyLayout(id) { return LobbyRouter.LOBBY_LAYOUTS.find(l => l.id === id) || null; }
function lobbyScreen(id) { const l = lobbyLayout(id); return l ? l.screen : 'screen-shelves'; }
function lobbyEligible() { return LouScene.louEligible(window.innerWidth, window.innerHeight, lobbyWebgl, lobbyReducedData); }
function lobbyCanArrive() { return LouScene.louCanArrive(lobbyWebgl, lobbyReducedData); }

/* Which layouts a switcher may offer this device, right now. Every switcher
   renders from this; lobbyGo refuses the rest — a hidden button is a courtesy,
   a refused transition is the rule. */
function lobbyOffered(id) {
  if (id === 'lounge') return lobbyState.arrival !== 'done' && lobbyEligible();
  if (id === 'tv') return lbTvEligible();
  return !!lobbyLayout(id);
}
function lobbyIsUp(view) { return lobbyState.view === view && !lobbyState.workshop; }

function lobbySay(text) {
  const el = document.getElementById('lou-status'); if (!el) return;
  el.textContent = text;
  if (lobbySayTimer) clearTimeout(lobbySayTimer);
  lobbySayTimer = setTimeout(() => { el.textContent = ''; lobbySayTimer = null; }, LOBBY_SAY_MS);
}

// ── The one write path ─────────────────────────────────────────────────────
function lobbyDispatch(action) {
  const prev = lobbyState;
  lobbyState = LobbyRouter.lobbyReduce(prev, action);
  if (lobbyState !== prev) lobbyApply(prev, lobbyState);
}

// ── Public entry points ────────────────────────────────────────────────────
/* THE seam. Every "back to the lobby" in the app lands here. */
function lobbyShow() {
  lobbyDispatch({ t: 'home' });
  lobbyPresent(lobbyState.view);
}
function lobbyGo(id) {
  if (!lobbyOffered(id)) return;
  lobbyDispatch({ t: 'go', view: id });
}
function lobbyButtonFor(gameId) { return document.getElementById(LOBBY_BTN_IDS[gameId] || ('btn-' + gameId)); }
/* Clicking the game's own lobby button runs its plugin's entry listener
   untouched — no plugin file knows these layouts exist (spec § 6). */
function lobbyLaunch(gameId) {
  const btn = lobbyButtonFor(gameId);
  if (!btn) { console.warn('lobbyLaunch: no lobby button for ' + gameId); return false; }
  btn.click();
  return true;
}
/* lbSet re-renders Shelves' markup, slot included — put the ornament back. */
function lobbyAfterLayoutRender() {
  if (!lobbyState.workshop && LOBBY_SLOTS[lobbyState.view]) lobbyMountOrnament(lobbyState.view);
}

// ── State to page ──────────────────────────────────────────────────────────
function lobbyApply(prev, next) {
  // The room: kept and stopped, never disposed, whenever anything else has the screen.
  if (next.room === 'absent' && prev.room !== 'absent') lobbyDisposeRoom();
  const roomUp = next.view === 'lounge' && !next.workshop && !next.stickerbook;
  if (roomUp) {
    if (lobbyScene) {
      lobbyScene.resume();
      /* resetView on the way IN clears a fade a door left lit (the phone's
         fadeOut, the dial's pushIn) and shuts the binder. Guarded on the
         transition, because a resize re-applies and must not snap a drag. */
      if (prev.view !== 'lounge' || prev.stickerbook || prev.workshop) lobbyScene.resetView();
    } else lobbyEnsureRoom();
  } else if (lobbyScene) lobbyScene.stop();
  if (lobbyScene && next.design && next.design !== prev.design) lobbyScene.setDesign(next.design);

  lobbyPaintSwitcher(next);

  if (next.stickerbook && !prev.stickerbook) lobbyOpenStickerbook();
  if (!next.stickerbook && prev.stickerbook && lobbySb) lobbySb.close();
  const hud = document.getElementById('lou-hud');
  if (hud) hud.style.visibility = next.stickerbook ? 'hidden' : '';

  /* The Lounge's controller DOOR asks for the Workshop through the router; an
     ornament opens it itself and only tells the router (onOpen). */
  if (next.workshop && !prev.workshop && next.view === 'lounge') lobbyOpenWorkshopFromRoom();

  if (!next.workshop && (next.view !== prev.view || prev.workshop)) lobbyPresent(next.view);

  // A lounge that no longer fits (a phone, or a window shrunk) plays the beat and hands on.
  if (next.view === 'lounge' && !next.workshop && !lobbyEligible()) lobbyRunArrival();
}

/* Show a layout and everything it owns. Idempotent — lobbyShow and a view change
   can both reach here in one turn, and a second call must cost nothing. */
function lobbyPresent(view) {
  const screen = document.getElementById(lobbyScreen(view));
  if (screen && screen.style.display !== 'flex') showScreen(lobbyScreen(view));
  const tvRoot = document.getElementById('tv-app');
  if (view !== 'tv' && tvRoot) tvDrop(tvRoot);        // TV's drift RAF + clock stop off screen (Timer Lifecycle)
  if (view === 'shelves') lbRender();
  if (view === 'tv') lbMountTVFull();
  if (LOBBY_SLOTS[view]) lobbyMountOrnament(view);
}

function lobbyMountOrnament(view) {
  ctlMountOrnament(LOBBY_SLOTS[view], {
    returnScreen: lobbyScreen(view),
    onOpen: () => lobbyDispatch({ t: 'workshopOpen' }),
    onReturn: lobbyWorkshopReturn,
  });
}
/* Handed the design that survived the close (saved, or restored on ✕). */
function lobbyWorkshopReturn(design) {
  lobbyDispatch({ t: 'designSaved', design });
  lobbyDispatch({ t: 'workshopClose' });
}
function lobbyOpenWorkshopFromRoom() {
  ctlOpenWorkshop({ returnScreen: 'screen-lounge', onReturn: lobbyWorkshopReturn });
}

// ── The dock ───────────────────────────────────────────────────────────────
function lobbyBuildSwitcher() {
  const list = document.getElementById('lobby-switcher-list');
  if (!list) return;
  list.innerHTML = '';
  for (const l of LobbyRouter.LOBBY_LAYOUTS) {
    const b = document.createElement('button');
    b.dataset.lobbyLayout = l.id;
    b.className = 'min-h-14 rounded-2xl bg-white border border-stone-200 flex flex-col items-center justify-center gap-1 font-semibold text-stone-700 active:scale-95 transition-transform duration-100';
    b.innerHTML = `<span class="text-2xl" aria-hidden="true">${l.ico}</span><span class="text-sm">${l.label}</span>`;
    b.addEventListener('click', () => lobbyGo(l.id));
    list.appendChild(b);
  }
  const close = document.getElementById('btn-lobby-switcher-close');
  if (close) close.addEventListener('click', () => lobbyDispatch({ t: 'closeSwitcher' }));
  const btn = document.getElementById('btn-lobby-layout');
  if (btn) btn.addEventListener('click', () => lobbyDispatch({ t: 'openSwitcher' }));
}
function lobbyPaintSwitcher(s) {
  const ov = document.getElementById('lobby-switcher-overlay');
  if (!ov) return;
  ov.style.display = s.switcher ? 'flex' : 'none';
  ov.querySelectorAll('[data-lobby-layout]').forEach(b => {
    const id = b.dataset.lobbyLayout;
    b.style.display = lobbyOffered(id) ? '' : 'none';
    b.setAttribute('aria-pressed', String(id === s.view));
  });
}

// ── The room ───────────────────────────────────────────────────────────────
function lobbyEnsureRoom() {
  if (lobbyScene || !lobbyHost) return;
  const full = lobbyEligible();
  if (!full && !lobbyCanArrive()) return;
  /* The arrival tier omits the controller: 87% of the prop build on a low-end
     phone, and out of the portrait frame anyway (DD-19). */
  lobbyScene = LouScene.louMount(document.getElementById('lou-canvas'), lobbyHost, { skipProps: full ? null : ['controller'] });
  lobbyRoomTier = full ? 'lounge' : 'arrival';
  lobbySyncBinder();
  lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'roomMounted' });   // a fact, not an intent
}
function lobbyDisposeRoom() {
  if (!lobbyScene) return;
  lobbyScene.dispose(); lobbyScene = null; lobbyRoomTier = null;
}
/* The phone tier's one-way handoff. Starting is a fact; finishing arrives later
   as the clamshell door's own action, so it inherits a proven path. */
function lobbyRunArrival() {
  if (lobbyState.arrival !== 'none' || !lobbyHost) return;
  lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'arrivalBegin' });
  if (!lobbyScene) { setTimeout(() => lobbyDispatch({ t: 'enterShelves' }), 0); return; }
  lobbyScene.arrive(() => lobbyDispatch({ t: 'enterShelves' }));
}
function lobbyOnResize() {
  const ok = lobbyEligible();
  /* Crossing the floor changes which room should exist: the arrival tier's has
     no controller, and must not be handed to a window that now qualifies. */
  if (lobbyLastOk !== null && ok !== lobbyLastOk && lobbyScene && lobbyRoomTier === 'arrival') {
    lobbyDisposeRoom();
    lobbyState = LobbyRouter.lobbyReduce(LobbyRouter.lobbyReduce(lobbyState, { t: 'leaveLobby' }), { t: 'arrivalReset' });
  }
  lobbyLastOk = ok;
  lobbyPaintSwitcher(lobbyState);
  if (lobbyState.workshop) return;
  if (lobbyState.view === 'tv') { lbMountTVFull(); lobbyMountOrnament('tv'); }
  if (lobbyState.view === 'lounge' && lobbyHost) lobbyApply(lobbyState, lobbyState);
}

// ── The stickerbook (v1: everything unlocked, nothing saved) ───────────────
function lobbySyncBinder() {
  if (!lobbyScene || !lobbyBook) return;
  const all = Achievements.achAllPlaced(lobbyBook);
  lobbyScene.withProp('binder', b => { if (b.setCollection) b.setCollection({ placed: Object.keys(all.placed), tray: [] }); });
}
function lobbyOpenStickerbook() {
  if (!lobbyBook) {
    lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'stickerbookClose' });   // a fact correction: nothing opened
    if (lobbyScene) { lobbyScene.resume(); lobbyScene.resetView(); }
    lobbySay('The sticker book could not load — it needs one trip online first.');
    return;
  }
  if (!lobbySb) lobbySb = Stickerbook.sbMount(document.getElementById('stickerbook-overlay'), {
    book: lobbyBook, base: LOBBY_DATA.stickers, reduced: () => ctlReducedMotion(),
    onIntent: (i) => { if (i.t === 'close') lobbyDispatch({ t: 'stickerbookClose' }); },
  });
  lobbySb.render(Achievements.achAllPlaced(lobbyBook));
  lobbySb.open();
}

// ── Content: each runtime-cached source fails ALONE (spec § 9.2) ───────────
function lobbyFetchJson(url) {
  return fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
}
function lobbyDesignColours() {
  const d = ctlReadDesign();
  return { shell: d.shell, plate: d.plate, ears: d.ears, buttons: d.buttons };
}
/* The jukebox is decorative in v1 (owner): it reads what the real Music plays and
   picks nothing — music stays driven by showScreen(). */
function lobbyMusicAdapter() {
  return {
    keys: GAMES.map(g => g.id),
    nowPlaying() { return (typeof Music !== 'undefined' && Music.nowPlaying) ? Music.nowPlaying() : null; },
    playFor() {},
  };
}
async function lobbyLoadContent() {
  const [stickerMan, lampMan] = await Promise.all([
    lobbyFetchJson(LOBBY_DATA.stickers + 'manifest.json'),
    lobbyFetchJson(LOBBY_DATA.lamp + 'manifest.json'),
  ]);
  const stickers = stickerMan && Array.isArray(stickerMan.stickers) ? stickerMan.stickers : [];
  lobbyBook = stickers.length ? Achievements.achDefine(stickers) : null;
  const lamp = lampMan && Array.isArray(lampMan.panels) ? lampMan : { panels: [] };
  lobbyHost = LobbyDoors.lobbyCreateHost({
    games: GAMES,
    stickers: { base: LOBBY_DATA.stickers, list: stickers },
    lampPanels: { base: LOBBY_DATA.lamp, manifest: lamp },
    design: lobbyDesignColours(),
    music: lobbyMusicAdapter(),
    dispatch: lobbyDispatch,
    openSound: () => openSoundOverlay(),
    sfx: (name) => { if (!isMuted && sfxEnabled && lobbySfx) lobbySfx.play(name); },
    controllerParts: () => (ctlEnsureModel() ? ctlModelParts() : null),
    debug: lobbyDebug,
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────
/* Synchronous up to the first screen, so nothing else is ever painted first
   (screen-lobby is hidden in markup for the same reason). */
function lobbyBoot() {
  try { const c = document.createElement('canvas'); lobbyWebgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { lobbyWebgl = false; }
  try { lobbyReducedData = !!(window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches); } catch (_) { lobbyReducedData = false; }
  lobbyDebug = new URLSearchParams(location.search).has('lobbydebug');
  lobbySfx = LouSfx.louCreateSfx();
  lobbyBuildSwitcher();
  lobbyLastOk = lobbyEligible();
  const first = (lobbyLastOk || lobbyCanArrive()) ? 'lounge' : 'shelves';
  if (first === 'shelves') lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'go', view: 'shelves' });
  showScreen(lobbyScreen(first));
  if (first === 'shelves') lobbyPresent('shelves');
  window.addEventListener('resize', lobbyOnResize);
  lobbyLoadContent().then(() => {
    if (lobbyState.view === 'lounge') { lobbyEnsureRoom(); lobbyApply(lobbyState, lobbyState); }
    lobbyPaintSwitcher(lobbyState);
    window.lobbyReady = true;
  });
}
```

- [ ] **Step 2: Load it and boot it**

In `src/screens/_scripts-3.html`, after `<script src="js/lobby/lobby-doors.js"></script>` add `<script src="js/lobby/lobby-host.js"></script>`.

In `js/app.js`, **replace** the Task 8 temporary line with:

```js
// The lobby's first screen — synchronous, at the end of the last script, so no
// other screen is ever painted first (js/lobby/lobby-host.js, spec § 5).
lobbyBoot();
```

In `js/controller.js`, **delete** `document.addEventListener('DOMContentLoaded', ctlMountLobby);` (the host mounts the ornament for whichever layout it lands on).

- [ ] **Step 3: The four seam sites**

`js/engine.js` `resetToLobby()`, last line:

```js
  lobbyShow();   // ← the router seam: the layout the player left from (also swaps music via showScreen)
```

`js/secret-mode.js` — in **both** the `sm-terminal-back` and `sm-btn-exit` handlers, replace

```js
  showScreen('screen-lobby');
  if (typeof ctlMountLobby === 'function') ctlMountLobby();
```

with

```js
  lobbyShow();   // the router seam — back to the layout the player left from
```

(The fourth site, the idle nudge, was done in Task 5.)

- [ ] **Step 4: Prove no other site still targets `screen-lobby`**

Run: `grep -rn "'screen-lobby'" js src/screens --include=*.js --include=*.html | grep -v "js/lobby/"`
Expected: exactly one hit — `CTL_RETURN_DEFAULT = 'screen-lobby'` in `js/controller.js` (DD-18's no-opener default). `js/engine.js`'s `allScreens` entry uses the string in a list, not a call — if it shows, that is fine too. Any `showScreen('screen-lobby')` is a missed seam site.

- [ ] **Step 5: Adapt the controller visual harness to the new boot**

In `tools/visual-controller-stickers.js`, the 390×844 `lobby` page now boots through the arrival beat into Shelves, so the ornament's slot is `shelves-controller`. Change the check

```js
    ok(mount.parent === 'lobby-controller' && mount.w > 0 && mount.h > 0 &&
```

to

```js
    ok(['lobby-controller', 'shelves-controller', 'tv-controller'].includes(mount.parent) && mount.w > 0 && mount.h > 0 &&
```

and update its message to `'the ornament paints BEFORE the sticker build (in ' + mount.parent + '): …'`. If the page's `waitForFunction(ctlBuilt…, { timeout: 20000 })` now times out because the beat runs first, raise that timeout to `30000` — do not skip the check.

- [ ] **Step 6: Build and run**

```bash
node tools/build-index.js && node tools/verify-build-fresh.js
node tools/visual-lobby.js 2>&1 | tail -30
node tools/visual-controller-stickers.js 2>&1 | tail -3
```

Expected: visual-lobby 0 failed (record its count); visual-controller-stickers at its Task 5 count, 0 failed. Work through each FAIL against the spec section it names — the harness is the contract; change the host, not the check, unless the check contradicts the spec (then say which, and why, in the Task 13 impl-notes).

---

### Task 11: The service worker — precache, `data/lamp/`, v231, and the install number

**Files:**
- Modify: `sw.js` — `CACHE_NAME` (line 4), `PRECACHE_URLS` (after `'js/controller.js'`), the header comment (~52), the stickers runtime branch (~288)

- [ ] **Step 1: Version and precache**

`const CACHE_NAME = 'sylly-games-v231';`

In `PRECACHE_URLS`, after `'js/controller.js',` add:

```js
  // The lobby's four layouts (SW v231). Code is part of the app version; the
  // lamp photos (data/lamp/) are NOT precached — see the fetch handler.
  'css/lobby.css',
  'js/lounge/lounge-lib.js',
  'js/lounge/lounge-room.js',
  'js/lounge/lounge-props.js',
  'js/lounge/lounge-scene.js',
  'js/lounge/lounge-sfx.js',
  'js/lobby/lobby-games.js',
  'js/lobby/lobby.js',
  'js/lobby/tv.js',
  'js/lobby/achievements.js',
  'js/lobby/stickerbook.js',
  'js/lobby/lobby-router.js',
  'js/lobby/lobby-doors.js',
  'js/lobby/lobby-host.js',
```

- [ ] **Step 2: The runtime branch**

In the header comment, change "controller stickers (data/stickers/) are NOT precached" to "controller stickers (data/stickers/) and the Lounge's lamp photos (data/lamp/) are NOT precached".

Replace `if (url.pathname.includes('/data/stickers/')) {` and its comment with:

```js
  // Stickers (data/stickers/) and the Lounge's lamp photos (data/lamp/) — runtime
  // cache, no precache, no version bump. Same contract as data/packs/ and
  // data/music/: a new sticker or photo is a file drop plus one manifest line.
  // The lamp photos are ~317 KB a phone never sees (docs/cost-envelope.md § 5).
  // The CODE that reads both IS precached — app code is part of the app version.
  if (url.pathname.includes('/data/stickers/') || url.pathname.includes('/data/lamp/')) {
```

- [ ] **Step 3: Every precached file exists**

```bash
node -e "const s=require('fs').readFileSync('sw.js','utf8');const u=[...s.matchAll(/^\s*'([^']+)',/gm)].map(m=>m[1]).filter(p=>!p.startsWith('http'));const miss=u.filter(p=>p!=='./'&&!require('fs').existsSync(p));console.log(u.length+' urls, missing: '+(miss.join(', ')||'none'))"
```

Expected: `missing: none`.

- [ ] **Step 4: Measure the install**

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('sw.js','utf8');const u=[...s.matchAll(/^\s*'([^']+)',/gm)].map(m=>m[1]).filter(p=>p!=='./'&&fs.existsSync(p));const size=p=>fs.statSync(p).size;const tot=u.reduce((a,p)=>a+size(p),0);const lob=u.filter(p=>/^js\/(lobby|lounge)\/|^css\/lobby/.test(p)).reduce((a,p)=>a+size(p),0);console.log('precache '+(tot/1048576).toFixed(2)+' MB; lobby delta '+(lob/1024).toFixed(0)+' KB')"
du -ch data/lamp/*.jpg | tail -1
```

Expected: a lobby delta near the spec's ~0.80 MB (§ 10). Record both numbers for Task 13. If the delta exceeds **0.90 MB**, stop and report to the owner before continuing — the spec proposed ~0.80.

---

### Task 12: Full regression, the seam mutation pass, clean-up

**Files:**
- Delete: `tools/migrate-lobby-sandbox.js`

- [ ] **Step 1: Every harness**

Re-run Task 1 Step 1's loop, plus:

```bash
node tools/verify-lounge-props.js | tail -1
node tools/visual-lounge.js | tail -1
node tools/verify-lobby-router.js | tail -1
node tools/verify-tv.js | tail -1
node tools/verify-achievements.js | tail -1
node tools/visual-lobby.js | tail -1
node tools/verify-identity-docs.js --self-test | tail -1
```

Expected: every production harness at its Task 1 count except `visual-controller-stickers` (+2, Task 5); the ported ones at the counts recorded in Tasks 3, 4, 6, 7, 10. **Zero failures anywhere.**

- [ ] **Step 2: The seam mutation pass**

For each site below, revert just that site, run `node tools/visual-lobby.js 2>&1 | grep -c FAIL`, then restore it. Each must go **red** (≥1 FAIL):

1. `js/engine.js` `resetToLobby()`: `lobbyShow();` → `showScreen('screen-lobby');` (expected red: section 4, "quitting lands back on …")
2. `js/secret-mode.js` `sm-terminal-back`: → `showScreen('screen-lobby');` (section 6, Terminal)
3. `js/secret-mode.js` `sm-btn-exit`: → `showScreen('screen-lobby');` (section 6, gateway)
4. `js/controller.js` idle nudge: restore the old `screen-lobby` check (section 7, Shelves/TV nudge)

A site whose revert stays green is not tested — add the check that catches it before going on.

- [ ] **Step 3: No production file points into `wip/`**

```bash
grep -rn "wip/" js css src data tools sw.js CLAUDE.md .claude/rules --include=* | grep -v "^tools/migrate-lobby-sandbox.js"
```

Expected: nothing under `js/`, `css/`, `src/`, `data/`, `sw.js`. Hits in `tools/` comments or docs are fine only if they describe history; a `require`/`fetch`/`src` pointing into `wip/` is a failure.

- [ ] **Step 4: Delete the migration script**

`rm tools/migrate-lobby-sandbox.js` — it has nothing left to do, and `wip/` is about to be archived.

- [ ] **Step 5: Temporarily rename `wip/` and re-run the ported harnesses**

```bash
mv wip wip.__away
for t in verify-lounge-props verify-lobby-router verify-tv verify-achievements; do node tools/$t.js | tail -1; done
node tools/visual-lounge.js | tail -1; node tools/visual-lobby.js | tail -1
mv wip.__away wip
```

Expected: identical counts with `wip/` gone — proof the archive step (spec § 11.3) is safe. **Always run the second `mv`**, even if a harness fails.

---

### Task 13: Documentation Integrity pass

**Files:** the docs below. Follow `CLAUDE.md` § Documentation Integrity Protocol's order.

- [ ] **Step 1: `docs/code-map.md`** — Grep for `3D Controller / Workshop` and add, after that section, a new `## Lobby layouts (SW v231)` section: the three new screens + `screen-lobby` as Original; the two overlays; the `lobby*` API table from `lobby-host.js`; `LOBBY_LAYOUTS`; router actions incl. `home`/`closeSwitcher`; the three ornament slots; `ctlEnsureModel`/`ctlModelParts`/`ctlMountOrnament`/`ctlOrnamentIsLive`; `js/lounge/*` one line each. Add the new partial to the Per-Game Offset Map's shell rows.
- [ ] **Step 2: `CLAUDE.md`** — move the v230 Current Focus entry verbatim to `docs/sw-changelog.md`; write the v231 entry (≤6 lines: four layouts, the Lounge first, the seam, the install number from Task 11, the harness counts). Update § Load Order (the 13 new scripts after `controller.js`). Add harness-table rows for `verify-lounge-props`, `visual-lounge`, `verify-lobby-router`, `verify-tv`, `verify-achievements`, `visual-lobby`; delete the sandbox `Achievements`/`Shell` rows. Replace the `⚠️ js/controller.js carries a shipped-code change that is NOT in v230` paragraph (it ships now). Replace the "Sandbox — …" / room-pass paragraphs with one pointer line to `docs/deferred-work.md` § Lobby redesign.
- [ ] **Step 3: `.claude/rules/logic-engine.md`** — add a `## Lobby Router Seam` section (lobbyShow is the only way in; nothing outside `js/lobby/` shows a layout screen; the four sites); in § PWA Guardian add `data/lamp/` to the runtime-cached list; in § Shared Library Modules add rows for `js/lounge/*` and `js/lobby/*`; in § Timer Lifecycle add TV's RAF/clock (`tvDrop`) and the host's `lobbySayTimer`.
- [ ] **Step 4: `.claude/rules/ui-style.md`** — § Legacy `h-screen` whitelist: add `screen-lounge` and `screen-tv` (fixed stages); § Z-Index Stack: `#lobby-switcher-overlay` at z-[90]; a short `## Lobby layouts` note (four layouts, switchers render from `LOBBY_LAYOUTS`, Original's label is display copy).
- [ ] **Step 5: `.claude/rules/definitions.md`** — Active plugin prefixes line: add the non-game prefixes `lou`, `tv`, `lb`, `lobby`, `ach`, `sb` (as "lobby modules, not games"); Technical Project Terms: *Layout*, *the Lounge*, *Home layout*, *Handed out*, *Ornament*.
- [ ] **Step 6: `docs/cost-envelope.md` § 3** — the new install total and the lobby delta from Task 11; `data/lamp/` in § 5's runtime-cached row.
- [ ] **Step 7: `docs/implementation-notes/shared-implementation-notes.md`** — one DD entry (What happened → Root cause → Lesson) for the round: the scoped-rename finding (the attract screen's "LOUNGE" text and the jukebox's `shellL`), the `Promise.all` offline finding, the `prm-hud.css` global `html, body` rule that would have stopped every game scrolling, the router's close-to-Lounge assumption, and anything Tasks 5–10 surfaced.
- [ ] **Step 8: `docs/decision-log.md`** — one entry, newest on top: *Lobby v1 shipped (SW v231): the Lounge (renamed from Premium) first; games return to the launching layout; stickerbook all-unlocked, nothing saved; lamp photos runtime-cached; +X KB precache.*
- [ ] **Step 9: `docs/deferred-work.md`** — in § Lobby redesign, mark production wiring DONE (one line, pointer to this plan and the DD). Add the spec § 13 items: **controller animation round (owner-prioritised)**, stickerbook earning + its localStorage key, stickerbook on phones (its own layout icon — the 🏆 slot in Shelves' dock), the fourth layout's label, the jukebox feature. Add **the owner's real-device pass** (desktop, phone, TV) and **the archive step** (spec § 11.3 — safe per Task 12 Step 5).
- [ ] **Step 10: Verify the docs didn't break the doc harness**

Run: `node tools/verify-identity-docs.js | tail -1` — at its Task 1 count.

---

### Task 14: One commit

- [ ] **Step 1: Review what is about to be committed**

```bash
git status --short | head -80
git diff --stat | tail -5
```

Make sure no screenshot, `wip.__away`, `node_modules`, or scratch file is staged. The owner's other uncommitted sandbox work (`wip/…`, specs, plans) was already in the tree before this round — ask the owner whether it rides this commit or is left for the archive; **do not decide for them**.

- [ ] **Step 2: Commit**

```bash
git add js/lobby js/lounge css/lobby.css data/lamp src/screens/lobby.html src/manifest.txt src/screens/_shell.html src/screens/_head.html src/screens/_scripts-3.html index.html js/engine.js js/secret-mode.js js/app.js js/controller.js sw.js tools/verify-lounge-props.js tools/visual-lounge.js tools/fixtures/lounge.html tools/verify-lobby-router.js tools/verify-tv.js tools/verify-achievements.js tools/visual-lobby.js tools/visual-controller-stickers.js docs/superpowers/specs/2026-09-25-lobby-production-wiring-design.md docs/superpowers/plans/2026-09-25-lobby-production-wiring.md docs/code-map.md CLAUDE.md .claude/rules docs/cost-envelope.md docs/implementation-notes/shared-implementation-notes.md docs/decision-log.md docs/deferred-work.md docs/sw-changelog.md
git commit -m "$(cat <<'EOF'
feat(lobby): ship the four layouts, the Lounge first (SW v231)

The Lounge (was Premium), TV, Shelves and Original, with every "back to the
lobby" routed through lobbyShow(). Games return to the layout they were
launched from. The ornament controller moves between layouts; the Lounge's
controller wears the Workshop's painted atlas. Stickerbook v1: all unlocked,
nothing saved. Lamp photos runtime-cached.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Hand back to the owner**

Report: the harness table (Task 12 Step 1), the install delta (Task 11 Step 4), the mutation-pass result, and the two owner steps left — the real-device pass on a desktop, a phone and the TV, and archiving `wip/lobby-lab/` + `wip/premium/` out of the repo.
