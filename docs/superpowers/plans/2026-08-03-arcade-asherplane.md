# Arcade Mode & Asherplane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mini arcade behind the Secret Mode backdoor, holding standalone canvas games, with Asherplane (a top-down shmup for young kids) as the first cabinet.

**Architecture:** `ARCADE` becomes the first category in the existing Sylly-OS terminal, backed by a six-line `SM_ARCADE` registry and a `smLaunchArcade()` path that sits **beside** the untouched `smLaunch()`. Cabinets are not packs and not Sylly Games — Asherplane is one self-contained file (`js/arcade/asherplane.js`) drawing procedurally to a canvas. A session-sticky unlock puts a `🕹️` tile on the lobby that reopens the cabinet list without touching the pack loader.

**Tech Stack:** Vanilla ES6+, HTML5 Canvas 2D, `requestAnimationFrame`. No libraries, no build step, no external assets.

**Spec:** `docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md`

## Global Constraints

- **No test framework exists in this project.** There is no npm, no webpack, no test runner. The standard TDD cycle does not map. Every task therefore uses this substitute cycle, and it is not optional: **`node --check` on each changed JS file → the task's explicit manual browser checkpoint → commit.** Do not skip the manual checkpoint; it is the only real verification this feature gets.
- **Do NOT create a `tools/verify-*.js` harness.** The spec excludes one deliberately (§2). This is a canvas game for children; there is nothing a headless harness would meaningfully assert.
- **`index.html` must be edited with a Node script, never the Edit tool.** That file carries a documented UTF-8 mojibake corruption risk. Every `index.html` step below supplies the script.
- **Zero external dependencies.** No images, no audio files, no npm, no CDN. All artwork drawn procedurally with Canvas 2D paths.
- **Australian English** in all user-facing copy and comments (colour, not color). Metric units only.
- **`ap` prefix** on every Asherplane global, per `definitions.md`. `sm` prefix on additions to `secret-mode.js`.
- **Asherplane is exempt from the suite's standards** (spec §2): no `MP_GAME_CONFIGS`, no `game-identities.md` section, no Sylly Mode, no settings or how-to overlay, not the Stack, not the brand palette, not `new-game-checklist.md`. It uses the terminal's CRT green-on-black language.
- **Do not use `CanvasRenderingContext2D.roundRect`.** It is unavailable on older iPad Safari, which is a target device. Use `fillRect` and explicit paths.
- **Canvas logical resolution is fixed at 360 × 640** (`AP_W` × `AP_H`). All drawing code works in those coordinates; scaling is handled once in `apResize()`.
- **Final SW version is `sylly-games-v163`** (from `v162`).

---

## File Structure

| File | Responsibility |
|------|---------------|
| `js/arcade/asherplane.js` | **New.** The entire game: canvas setup, RAF loop, state machine, entities, rendering, input, leaderboard. Self-contained; the only things it reads from outside are `showScreen`, `playSecretBeep`, `isMuted`, `masterVolume`. |
| `js/secret-mode.js` | **Modify.** Arcade registry + terminal category + launch path + sticky unlock + lobby tile + `resetSecretMode()` carve-out. |
| `js/engine.js` | **Modify.** One `allScreens[]` entry, one `resetArcade()` forward-ref call. |
| `index.html` | **Modify.** One `<section>` (the arcade screen), one `<script>` tag. |
| `sw.js` | **Modify.** One `PRECACHE_URLS` entry, `CACHE_NAME` bump. |
| `docs/decision-log.md` | **Modify.** One entry. |
| `CLAUDE.md` | **Modify.** Short pointer. |

---

### Task 1: Arcade screen, engine registration, and a reachable stub

Creates the screen and the file, wires both into the engine and the service worker, and proves the screen is reachable before any game logic exists.

**Files:**
- Create: `js/arcade/asherplane.js`
- Modify: `js/engine.js:20-85` (`allScreens[]`), `js/engine.js:530-531` (`resetToLobby` teardown)
- Modify: `index.html` (new `<section>` before the `ss-help-tip-overlay` comment; new `<script>` before `js/app.js`)
- Modify: `sw.js:4` (`CACHE_NAME`), `sw.js:35` (`PRECACHE_URLS`)

**Interfaces:**
- Consumes: `showScreen(id)` from `engine.js`
- Produces: `apStart()` — enters the arcade screen and starts the game. `resetArcade()` — cancels the RAF loop and clears transient state; **must not** clear `apLeaderboard`.

- [ ] **Step 1: Create the game file with a stub**

Create `js/arcade/asherplane.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// asherplane.js — ARCADE CABINET 01. Top-down shmup, procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// See docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md § 2.
// Depends on: engine.js (showScreen), secret-mode.js (playSecretBeep)
// ═══════════════════════════════════════════════════════════════════════════

// ── Logical canvas size — ALL drawing code works in these coordinates ────────
const AP_W = 360;
const AP_H = 640;

// ── Runtime state ────────────────────────────────────────────────────────────
let apCanvas    = null;
let apCtx       = null;
let apRafHandle = null;   // TIMER — cancel in every teardown (logic-engine.md)

// Session leaderboard. Deliberately NOT cleared by resetArcade() — it survives
// trips to the lobby so two kids can compare scores across an afternoon.
let apLeaderboard = [];

function apStart() {
  apCanvas = document.getElementById('ap-canvas');
  apCtx    = apCanvas.getContext('2d');
  showScreen('screen-arcade-asherplane');
  apResize();
  apCtx.fillStyle = '#000';
  apCtx.fillRect(0, 0, AP_W, AP_H);
  apCtx.fillStyle = '#4ADE80';
  apCtx.font = 'bold 24px monospace';
  apCtx.textAlign = 'center';
  apCtx.fillText('ASHERPLANE', AP_W / 2, AP_H / 2);
}

// Fit the fixed 360x640 logical canvas into its container, preserving aspect,
// and scale the backing store by devicePixelRatio so it stays sharp on Retina.
function apResize() {
  if (!apCanvas) return;
  const box   = apCanvas.parentElement;
  const scale = Math.min(box.clientWidth / AP_W, box.clientHeight / AP_H);
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);
  apCanvas.style.width  = Math.floor(AP_W * scale) + 'px';
  apCanvas.style.height = Math.floor(AP_H * scale) + 'px';
  apCanvas.width        = Math.floor(AP_W * dpr);
  apCanvas.height       = Math.floor(AP_H * dpr);
  apCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Called from engine.js resetToLobby() via forward reference.
function resetArcade() {
  if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-asherplane').style.display !== 'none') apResize();
});
```

- [ ] **Step 2: Register the screen in `allScreens[]`**

In `js/engine.js`, the array ends at line 85 with `];`. Add the arcade entry as the final element, after the `screen-cjar-gameover` line:

```js
  'screen-cjar-busted', 'screen-cjar-raid-summary', 'screen-cjar-gameover',
  // Arcade cabinets (Secret Mode) — not Sylly Games, but still real screens.
  'screen-arcade-asherplane',
];
```

- [ ] **Step 3: Call `resetArcade()` from `resetToLobby()`**

In `js/engine.js` around line 531, immediately after the existing `resetSecretMode()` forward-ref call:

```js
  // Secret Mode hard-reset (forward ref — safe at runtime)
  if (typeof resetSecretMode === 'function') resetSecretMode();
  // Arcade cabinet teardown (forward ref) — cancels the RAF loop. Deliberately
  // does NOT clear the session leaderboard; see asherplane.js.
  if (typeof resetArcade === 'function') resetArcade();
```

- [ ] **Step 4: Insert the arcade screen markup into `index.html`**

Write and run this Node script from the repo root (`node scratch-arcade-markup.js`, then delete it):

```js
const fs = require('fs');
const p = 'index.html';
let html = fs.readFileSync(p, 'utf8');

const anchor = '  <!-- ss-help-tip-overlay (decision modal z-[90] — contextual help) -->';
if (!html.includes(anchor)) throw new Error('anchor not found — do not proceed');
if (html.includes('screen-arcade-asherplane')) throw new Error('already inserted');

// h-screen + overflow-hidden is the deprecated sticky-footer shape for Sylly
// screens, but this is an arcade cabinet (spec § 2) and a canvas game must not
// scroll under a held thumb. Deliberate, not drift.
const section = `  <!-- ══ ARCADE CABINET 01 — ASHERPLANE ══ -->
  <section id="screen-arcade-asherplane" style="display:none"
    class="relative flex flex-col w-full h-screen bg-black font-mono overflow-hidden">
    <div class="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
      <div class="text-green-400 text-xs tracking-widest opacity-60 select-none">ASHERPLANE</div>
      <div class="flex items-center gap-2">
        <button class="btn-open-sound text-xl text-green-400 active:scale-90 transition-transform duration-100 min-h-11 min-w-11">🔊</button>
        <button id="btn-ap-exit" class="text-green-400 text-lg font-bold active:scale-90 transition-transform duration-100 min-h-11 min-w-11">✕</button>
      </div>
    </div>
    <div id="ap-stage" class="flex-1 min-h-0 flex items-center justify-center" style="touch-action:none">
      <canvas id="ap-canvas" class="block"></canvas>
    </div>
  </section>

`;

html = html.replace(anchor, section + anchor);
html = html.replace('  <script src="js/app.js"></script>',
  '  <script src="js/arcade/asherplane.js"></script>\n  <script src="js/app.js"></script>');

fs.writeFileSync(p, html, 'utf8');
console.log('index.html updated');
```

- [ ] **Step 5: Update `sw.js`**

Change line 4 from `const CACHE_NAME = 'sylly-games-v162';` to:

```js
const CACHE_NAME = 'sylly-games-v163';
```

And in `PRECACHE_URLS`, insert the arcade file immediately before `'js/app.js',` (line 36):

```js
  'js/secret-mode.js',
  'js/arcade/asherplane.js',
  'js/app.js',
```

- [ ] **Step 6: Syntax check**

```bash
node --check js/arcade/asherplane.js && node --check js/engine.js && node --check sw.js
```

Expected: no output (all three parse).

- [ ] **Step 7: Manual browser checkpoint**

Serve the app and open it. In the DevTools console run:

```js
apStart()
```

Expected: the screen turns black, `ASHERPLANE` renders in green at the centre of a letterboxed canvas, and the header shows `🔊` and `✕`. Resize the window — the canvas rescales and stays centred without distortion. Confirm `document.getElementById('ap-canvas').width` is larger than its CSS width on a Retina display (DPR scaling is active).

- [ ] **Step 8: Commit**

```bash
git add js/arcade/asherplane.js js/engine.js index.html sw.js
git commit -m "feat(arcade): add the Asherplane screen, engine registration and SW entry

Creates js/arcade/asherplane.js with the canvas harness (fixed 360x640
logical resolution, DPR-scaled backing store) and a stub apStart(). The
screen is registered in allScreens[] and resetArcade() is wired into
resetToLobby() as a forward reference, so the RAF loop added in Task 4
already has its teardown site.

Deliberately js/arcade/ and not js/games/ — cabinets are not Sylly Games.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The ARCADE terminal category and launch path

Makes the cabinet reachable through the Konami code, with `ARCADE` as the **first** category.

**Files:**
- Modify: `js/secret-mode.js:16-30` (add `SM_ARCADE` after `SM_GAMES`), `js/secret-mode.js:326-369` (`smRenderExpansions`, `smSelectCategory`), and append `smRenderArcade` / `smLaunchArcade` after `smRenderSkinGames` (~line 402)

**Interfaces:**
- Consumes: `apStart()` from Task 1; existing `SM_BTN_CLS`, `smAppendBackButton`, `smShowList`, `smLogLine`, `smLogSpacer`, `playSecretBeep`
- Produces: `SM_ARCADE` (array of `{ id, label, screen, start }`), `smLaunchArcade(id)`, `smRenderArcade()`, `smArcadeLastId` (string | null)

- [ ] **Step 1: Add the cabinet registry**

In `js/secret-mode.js`, immediately after the `SM_GAMES` array closes (line 30):

```js
// ── Arcade cabinets — standalone canvas games, NOT packs and NOT Sylly Games.
// Adding a cabinet = one entry here + one file in js/arcade/. No pack manifest,
// no MP config, no game-identities entry. See the spec § 2 for the exemption.
const SM_ARCADE = [
  { id: 'asherplane', label: 'ASHERPLANE', screen: 'screen-arcade-asherplane',
    start: () => apStart() },
];

// Last cabinet played this session — survives resetSecretMode() (see below).
let smArcadeLastId = null;
```

- [ ] **Step 2: Put ARCADE first in the category list**

In `smRenderExpansions()` (line ~332), replace the three lines that build `cats`:

```js
  const cats = [];
  if (hasWords) cats.push({ id: 'words', label: 'WORD PACKS' });
  if (hasSkins) cats.push({ id: 'skins', label: 'GAME SKINS' });
```

with:

```js
  // ARCADE leads: Secret Mode is broader than "packs that change existing games".
  // It is unconditional — cabinets are engine knowledge, not pack data, so it
  // renders even when the pack registry failed to load.
  const cats = [{ id: 'arcade', label: 'ARCADE' }];
  if (hasWords) cats.push({ id: 'words', label: 'WORD PACKS' });
  if (hasSkins) cats.push({ id: 'skins', label: 'GAME SKINS' });
```

- [ ] **Step 3: Route the arcade category**

Replace the whole of `smSelectCategory` (lines ~360-369) with:

```js
function smSelectCategory(cat) {
  playSecretBeep(660);
  const label = cat === 'arcade' ? 'ARCADE'
              : cat === 'words'  ? 'WORD PACKS'
              :                    'GAME SKINS';
  smLogLine(`> CATEGORY: ${label} SELECTED`);
  smLogSpacer();
  smLogLine(cat === 'arcade' ? '  └─ SELECT CABINET:'
          : cat === 'words'  ? '  └─ SELECT PACK:'
          :                    '  └─ SELECT GAME:');
  document.getElementById('sm-terminal-log').scrollTop = document.getElementById('sm-terminal-log').scrollHeight;
  if      (cat === 'arcade') smRenderArcade();
  else if (cat === 'words')  smRenderWordPacks();
  else                       smRenderSkinGames();
}
```

- [ ] **Step 4: Add the cabinet list and launch path**

Append after `smRenderSkinGames()` closes (~line 402):

```js
// ── Arcade drill-down: cabinet list → launch ──────────────────────────────────
// Tapping a cabinet launches it immediately. This diverges from the skin flow
// (which arms, then needs a LAUNCH tap) on purpose: skins arm first so the
// active settings can be reviewed before committing, and a cabinet has none.
function smRenderArcade() {
  const wrap = document.getElementById('sm-terminal-expansions');
  wrap.innerHTML = '';
  smAppendBackButton(wrap);
  SM_ARCADE.forEach((cab, i) => {
    const btn = document.createElement('button');
    btn.className = SM_BTN_CLS;
    btn.textContent = `  [${i + 1}] ${cab.label}`;
    btn.addEventListener('click', () => smLaunchArcade(cab.id));
    wrap.appendChild(btn);
  });
  smShowList(wrap);
}

// Lean sibling of smLaunch(). No word bank, no settings overrides, no asset
// pack, no breadcrumb banner — a cabinet has no host game to decorate.
// smLaunch() is deliberately left untouched.
function smLaunchArcade(id) {
  const cab = SM_ARCADE.find(c => c.id === id);
  if (!cab) return;
  isSecretMode   = true;
  smArcadeLastId = id;
  playSecretBeep(523);
  setTimeout(() => playSecretBeep(784), 120);
  setTimeout(() => cab.start(), 260);
}
```

- [ ] **Step 5: Syntax check**

```bash
node --check js/secret-mode.js
```

Expected: no output.

- [ ] **Step 6: Manual browser checkpoint**

Hard-reload the app. Tap the `🎮` lobby icon 7 times quickly → controller screen. Enter ↑↑↓↓←→←→ B A START.

Expected, in order:
1. The terminal boots and the category list reads `[1] ARCADE`, `[2] WORD PACKS`, `[3] GAME SKINS`, `[4] ??? [CLASSIFIED]`.
2. Tapping `[1] ARCADE` logs `> CATEGORY: ARCADE SELECTED` then `└─ SELECT CABINET:` and lists `[←] BACK` and `[1] ASHERPLANE`.
3. Tapping `[1] ASHERPLANE` plays the two-note launch beep and lands on the black stub screen from Task 1.
4. `[←] BACK` from the cabinet list returns to the category list.
5. Regression: `[2] WORD PACKS` and `[3] GAME SKINS` still drill down and launch exactly as before.

- [ ] **Step 7: Commit**

```bash
git add js/secret-mode.js
git commit -m "feat(arcade): add the ARCADE terminal category and launch path

ARCADE leads the category list, ahead of WORD PACKS and GAME SKINS, and
renders unconditionally since cabinets are engine knowledge rather than
pack data. smLaunchArcade() is a lean sibling of smLaunch(), which is
left untouched — a cabinet has no host game, word bank or overrides.

Tapping a cabinet launches straight away; the skin flow's arm-then-LAUNCH
step exists to review active settings, and a cabinet has none.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Sticky session unlock and the lobby tile

Grants the arcade for the rest of the browser session on first Konami success, and adds the `🕹️` shortcut beside the lobby's `🎮`.

**Files:**
- Modify: `js/secret-mode.js:164-179` (`resetSecretMode` carve-out), `js/secret-mode.js:208-228` (`smHandleButton`), and append `smArcadeUnlocked` / `smShowArcadeTile` / `smOpenArcadeMenu` near the arcade block from Task 2

**Interfaces:**
- Consumes: `SM_ARCADE`, `smRenderArcade`, `smTypeLines`, `smOpenTerminal`'s pane-clearing shape
- Produces: `smArcadeUnlocked` (bool), `smShowArcadeTile()`, `smOpenArcadeMenu()`

- [ ] **Step 1: Add the unlock flag, the tile, and the menu opener**

Append after `smLaunchArcade()` from Task 2:

```js
// ── Sticky session unlock ─────────────────────────────────────────────────────
// Flips true the moment the Konami sequence lands — the discovery beat. Stays
// true until the page is reloaded, so the arcade needs unlocking once per
// session rather than once per visit to the lobby. Memory only: no
// localStorage, and "scores last the afternoon, not forever" is the intent.
let smArcadeUnlocked = false;

// Injects the 🕹️ shortcut beside the lobby's 🎮. Built in JS rather than in
// index.html because the tile only exists once unlocked — this keeps the whole
// arcade self-contained and leaves the lobby markup alone. Idempotent.
function smShowArcadeTile() {
  if (document.getElementById('sm-arcade-tile')) return;
  const icon = document.getElementById('lobby-icon');
  if (!icon) return;
  const row = document.createElement('div');
  row.className = 'flex items-center justify-center gap-4';
  icon.parentElement.insertBefore(row, icon);
  row.appendChild(icon);
  const btn = document.createElement('button');
  btn.id = 'sm-arcade-tile';
  btn.className = 'text-5xl active:scale-90 transition-transform duration-100 min-h-11 min-w-11';
  btn.setAttribute('aria-label', 'Arcade');
  btn.textContent = '🕹️';
  btn.addEventListener('click', () => { playSecretBeep(660); smOpenArcadeMenu(); });
  row.appendChild(btn);
}

// Lean sibling of smOpenTerminal(). Critically it does NOT await smLoadPacks():
// cabinets need no pack data, so the arcade still opens on a cold offline start
// — exactly the case where the registry fetch fails and smRunBootError() would
// otherwise block entry.
function smOpenArcadeMenu() {
  smSelectedExpansion   = null;
  smSelectedGame        = null;
  smSelectedSubCategory = null;
  document.getElementById('sm-terminal-log').innerHTML            = '';
  document.getElementById('sm-terminal-expansions').innerHTML     = '';
  document.getElementById('sm-terminal-expansions').style.display = 'none';
  document.getElementById('sm-terminal-subcategories').innerHTML     = '';
  document.getElementById('sm-terminal-subcategories').style.display = 'none';
  document.getElementById('sm-terminal-games').innerHTML          = '';
  document.getElementById('sm-terminal-games').style.display      = 'none';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  const sp = document.getElementById('sm-terminal-settings');
  if (sp) sp.remove();
  showScreen('screen-secret-terminal');
  smTypeLines([
    '> SYLLY-OS ARCADE',
    '> INSERT COIN...',
    '',
    '  └─ SELECT CABINET:',
  ], 0, 200, smRenderArcade);
}
```

- [ ] **Step 2: Grant the unlock on Konami success**

In `smHandleButton()`, inside the `if (smKonamiBuffer.join('') === SM_KONAMI.join(''))` block, immediately after `smUpdateProgress();` (line ~216):

```js
    smKonamiBuffer = [];
    smUpdateProgress();
    // Discovery beat — the arcade stays unlocked for the rest of the session.
    smArcadeUnlocked = true;
    smShowArcadeTile();
```

Note: the keyboard-Konami listener at the bottom of the file only *opens the controller screen*; it does not grant access. `smHandleButton()` is the single grant path and must stay that way.

- [ ] **Step 3: Carve the arcade out of `resetSecretMode()`**

`resetSecretMode()` is called from `resetToLobby()`, so without this the arcade re-locks and the scores vanish on every trip to the lobby — the exact problem the sticky unlock exists to solve. Add this comment block at the end of the function, immediately before `smUpdateProgress();` (line ~178):

```js
  window.activeExpansionData = null;
  // DELIBERATELY NOT CLEARED: smArcadeUnlocked, smArcadeLastId and the
  // Asherplane session leaderboard. This function runs on every resetToLobby(),
  // so clearing them would re-lock the arcade and wipe the scores each time a
  // child backs out to the menu. That is the whole problem the sticky unlock
  // solves. Do not "tidy" these into the list above.
  smUpdateProgress();
```

- [ ] **Step 4: Syntax check**

```bash
node --check js/secret-mode.js
```

Expected: no output.

- [ ] **Step 5: Manual browser checkpoint**

1. Hard-reload. The lobby shows `🎮` alone — no joystick.
2. Enter the Konami code. Note that the tile is injected while the lobby is hidden.
3. From the terminal, `[1] ARCADE` → `[1] ASHERPLANE` → the stub screen.
4. In the console run `resetToLobby()`. Expected: the lobby now shows `🎮 🕹️` side by side, horizontally centred and evenly spaced.
5. Tap `🕹️`. Expected: the terminal opens with the short `> SYLLY-OS ARCADE / > INSERT COIN...` boot — **not** the full `BOOTING SYLLY-OS` sequence — and lists the cabinet directly. Two taps from lobby to the stub screen.
6. Offline check: DevTools → Network → **Offline**, then tap `🕹️` again. Expected: the cabinet list still renders (this path never awaits `smLoadPacks()`). Go back and open the terminal via the Konami code while still offline — that path may show `[ LOAD FAILED ]`, which is correct and unchanged behaviour.
7. Hard-reload. Expected: the tile is gone and the arcade is locked again.

- [ ] **Step 6: Commit**

```bash
git add js/secret-mode.js
git commit -m "feat(arcade): sticky session unlock and the lobby joystick tile

The Konami sequence now grants smArcadeUnlocked for the rest of the
browser session and injects a joystick beside the lobby's controller.
The tile opens the cabinet list via smOpenArcadeMenu(), a lean sibling
of smOpenTerminal() that never awaits smLoadPacks() — so the arcade
still opens on a cold offline start, where the pack registry fetch
fails and the normal boot would show LOAD FAILED.

resetSecretMode() runs on every resetToLobby(), so the unlock flag, the
last-played id and the session leaderboard are explicitly carved out of
it with a comment saying why.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Canvas harness — game loop, state machine, input

Replaces the Task 1 stub with a real RAF loop, the state machine, and a player that moves. No enemies yet: this task is about proving the loop's lifecycle is correct before anything depends on it.

**Files:**
- Modify: `js/arcade/asherplane.js` (replace the stub `apStart`, add loop/state/input)

**Interfaces:**
- Consumes: `playSecretBeep(freq)` from `secret-mode.js`, `showScreen`, `resetToLobby` from `engine.js`
- Produces: `apState` (`'attract' | 'playing' | 'nameEntry' | 'leaderboard'`), `apEnterState(next)`, `apLoop(now)`, `apToLogical(e)`, `apHit(r, p)`, `apResetRun()`, `apPlayer`, `apDir`, `AP_SOUND`

- [ ] **Step 1: Add state, constants and the sound map**

In `js/arcade/asherplane.js`, replace everything between the `AP_H` constant and `function apStart()` with:

```js
// ── Tuning ───────────────────────────────────────────────────────────────────
const AP_PLAYER_SPEED = 260;   // logical px/sec
const AP_BULLET_SPEED = 420;
const AP_FIRE_MS      = 200;
const AP_INVULN_MS    = 1500;
const AP_START_LIVES  = 2;
const AP_CAR_COLOURS  = ['#E63946', '#FFB703', '#52B788', '#9B5DE5', '#00B4D8'];

// ── Audio — one map of moments onto the existing NES-style beep. Same shape as
// CJAR_SOUND / PKO_EVENT_SOUND. Inherits isMuted and masterVolume for free.
// There is deliberately no per-shot sound: at 5 shots/sec it grates.
const AP_SOUND = {
  explode:   () => playSecretBeep(220),
  hit:       () => playSecretBeep(110),
  gameOver:  () => playSecretBeep(160),
  highScore: () => playSecretBeep(1046),
  select:    () => playSecretBeep(660),
};

// ── Runtime state ────────────────────────────────────────────────────────────
let apCanvas    = null;
let apCtx       = null;
let apRafHandle = null;   // TIMER — cancel in every teardown (logic-engine.md)
let apLastT     = 0;
let apState     = 'attract';

let apScore   = 0;
let apLives   = AP_START_LIVES;
let apShake   = 0;        // seconds remaining
let apInvuln  = 0;        // ms remaining
let apPlayer  = { x: AP_W / 2, y: AP_H - 70, w: 34, h: 30 };
let apBullets = [];
let apCars    = [];
let apParts   = [];
let apStars   = [];
let apFireT   = 0;
let apSpawnT  = 0;

let apDir  = 0;                            // -1 left, 0 still, 1 right
let apKeys = { left: false, right: false };

// Session leaderboard. Deliberately NOT cleared by resetArcade() — it survives
// trips to the lobby so two kids can compare scores across an afternoon.
let apLeaderboard = [];
```

- [ ] **Step 2: Replace `apStart` and add the loop and state machine**

Replace the stub `apStart()` with:

```js
function apStart() {
  apCanvas = document.getElementById('ap-canvas');
  apCtx    = apCanvas.getContext('2d');
  if (apStars.length === 0) {
    for (let i = 0; i < 40; i++) {
      apStars.push({ x: Math.random() * AP_W, y: Math.random() * AP_H,
                     s: 20 + Math.random() * 50, l: 2 + Math.random() * 6 });
    }
  }
  showScreen('screen-arcade-asherplane');
  apResize();
  apEnterState('attract');
}

// Every exit from 'playing' cancels the loop; every entry starts it. Keeping
// both in one place is what stops a stray loop ticking against a dead screen.
function apEnterState(next) {
  apState = next;
  if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
  if (next === 'playing') apResetRun();
  apLastT = 0;
  apRafHandle = requestAnimationFrame(apLoop);
}

function apResetRun() {
  apScore   = 0;
  apLives   = AP_START_LIVES;
  apShake   = 0;
  apInvuln  = 0;
  apPlayer.x = AP_W / 2;
  apBullets = [];
  apCars    = [];
  apParts   = [];
  apFireT   = 0;
  apSpawnT  = 0;
}

function apLoop(now) {
  if (!apLastT) apLastT = now;
  // Clamp dt so a backgrounded tab cannot teleport every entity across the
  // screen on the first frame back.
  const dt = Math.min((now - apLastT) / 1000, 0.05);
  apLastT = now;

  if (apState === 'playing') apUpdate(dt);
  apDraw(dt);

  apRafHandle = requestAnimationFrame(apLoop);
}
```

- [ ] **Step 3: Add player movement (the only `apUpdate` behaviour for now)**

```js
function apUpdate(dt) {
  const keyDir = (apKeys.right ? 1 : 0) - (apKeys.left ? 1 : 0);
  const dir    = keyDir !== 0 ? keyDir : apDir;
  apPlayer.x  += dir * AP_PLAYER_SPEED * dt;
  const half   = apPlayer.w / 2;
  apPlayer.x   = Math.max(half, Math.min(AP_W - half, apPlayer.x));
  if (apShake  > 0) apShake  = Math.max(0, apShake - dt);
  if (apInvuln > 0) apInvuln = Math.max(0, apInvuln - dt * 1000);
}
```

- [ ] **Step 4: Add drawing**

```js
function apDraw(dt) {
  const g = apCtx;
  g.save();
  if (apShake > 0) {
    g.translate((Math.random() - 0.5) * 8 * apShake * 6,
                (Math.random() - 0.5) * 8 * apShake * 6);
  }
  g.fillStyle = '#05070D';
  g.fillRect(-20, -20, AP_W + 40, AP_H + 40);

  // Scrolling star field — cheap, and it is what sells the sense of flying.
  g.fillStyle = '#1E3A5F';
  apStars.forEach(s => {
    if (apState === 'playing') { s.y += s.s * dt; if (s.y > AP_H) { s.y = -s.l; s.x = Math.random() * AP_W; } }
    g.fillRect(s.x, s.y, 2, s.l);
  });

  if (apState === 'playing') {
    apDrawGlider(apPlayer.x, apPlayer.y, apInvuln > 0 && Math.floor(apInvuln / 100) % 2 === 0);
    apDrawHud();
  } else if (apState === 'attract') {
    apDrawAttract();
  }
  g.restore();
}

function apDrawGlider(x, y, dim) {
  const g = apCtx;
  g.save();
  g.translate(x, y);
  if (dim) g.globalAlpha = 0.3;
  g.fillStyle = '#2E7FD4';
  g.beginPath();                                   // wings
  g.moveTo(-17, 6); g.lineTo(0, -2); g.lineTo(17, 6);
  g.lineTo(17, 11); g.lineTo(0, 7);  g.lineTo(-17, 11);
  g.closePath(); g.fill();
  g.beginPath();                                   // fuselage
  g.moveTo(0, -15); g.lineTo(5, 10); g.lineTo(0, 15); g.lineTo(-5, 10);
  g.closePath(); g.fill();
  g.fillRect(-8, 11, 16, 4);                       // tail
  g.fillStyle = '#9BD1FF';                         // nose highlight
  g.beginPath();
  g.moveTo(0, -15); g.lineTo(2, -6); g.lineTo(-2, -6);
  g.closePath(); g.fill();
  g.restore();
}

function apDrawHud() {
  const g = apCtx;
  g.fillStyle = '#4ADE80';
  g.font = 'bold 14px monospace';
  g.textAlign = 'left';
  g.fillText(String(apScore).padStart(6, '0'), 10, 22);
  g.textAlign = 'right';
  g.fillText('✈'.repeat(Math.max(0, apLives)), AP_W - 10, 22);
}

function apDrawAttract() {
  const g = apCtx;
  g.textAlign = 'center';
  g.fillStyle = '#4ADE80';
  g.font = 'bold 30px monospace';
  g.fillText('ASHERPLANE', AP_W / 2, 190);
  g.font = '12px monospace';
  g.fillText('HOLD LEFT OR RIGHT TO FLY', AP_W / 2, 225);
  g.fillText('YOU SHOOT ALL BY YOURSELF', AP_W / 2, 245);
  apDrawGlider(AP_W / 2, 330, false);
  apDrawButton(AP_BTN_PLAY, 'PLAY');
}

// Shared big-target button. Menu screens are drawn on the canvas and hit-tested
// against these rects, so there is one input path rather than a DOM overlay.
const AP_BTN_PLAY = { x: 80, y: 430, w: 200, h: 62 };

function apDrawButton(r, label) {
  const g = apCtx;
  g.strokeStyle = '#4ADE80';
  g.lineWidth = 3;
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = '#4ADE80';
  g.font = 'bold 22px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  g.textBaseline = 'alphabetic';
}
```

- [ ] **Step 5: Add input**

```js
// Convert a pointer event to logical 360x640 canvas coordinates.
function apToLogical(e) {
  const r = apCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * AP_W / r.width,
           y: (e.clientY - r.top)  * AP_H / r.height };
}

function apHit(r, p) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// Pointer lives on #ap-stage, not the canvas, so the whole letterboxed area
// steers. During play only the half of the stage matters, so a thumb never has
// to find a button; on menu screens the tap is hit-tested against the drawn
// button rects instead.
function apStagePointer(e, phase) {
  const stage = document.getElementById('ap-stage');
  if (apState === 'playing') {
    if (phase === 'up') { apDir = 0; return; }
    const r = stage.getBoundingClientRect();
    apDir = e.clientX < r.left + r.width / 2 ? -1 : 1;
    return;
  }
  if (phase !== 'down') return;
  const p = apToLogical(e);
  if (apState === 'attract' && apHit(AP_BTN_PLAY, p)) {
    AP_SOUND.select();
    apEnterState('playing');
  }
}

(function apBindInput() {
  const stage = document.getElementById('ap-stage');
  stage.addEventListener('pointerdown',   e => { stage.setPointerCapture(e.pointerId); apStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',   e => { if (e.buttons) apStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',     e => apStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => apStagePointer(e, 'up'));

  document.addEventListener('keydown', e => {
    if (document.getElementById('screen-arcade-asherplane').style.display === 'none') return;
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') apKeys.left  = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') apKeys.right = true;
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') apKeys.left  = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') apKeys.right = false;
  });

  document.getElementById('btn-ap-exit').addEventListener('click', () => {
    resetArcade();
    resetToLobby();
  });

  // A child WILL put the iPad down mid-run. Without this the loop keeps ticking
  // against a hidden screen, and the dt clamp alone would not stop the run
  // continuing unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.getElementById('screen-arcade-asherplane').style.display === 'none') return;
    if (document.hidden) {
      if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
    } else if (!apRafHandle) {
      apLastT = 0;
      apRafHandle = requestAnimationFrame(apLoop);
    }
  });
})();
```

- [ ] **Step 6: Extend `resetArcade()` to reset the state machine**

Replace the Task 1 `resetArcade()` with:

```js
function resetArcade() {
  if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
  apState = 'attract';
  apDir   = 0;
  apKeys.left = apKeys.right = false;
  // apLeaderboard is NOT cleared — see the declaration above.
}
```

- [ ] **Step 7: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 8: Manual browser checkpoint**

Reach the cabinet via Konami → `[1] ARCADE` → `[1] ASHERPLANE`.

1. The attract screen shows the title, both control hints, a drawn glider and a `PLAY` box. Stars scroll... they should be **still** on attract (they only advance while `playing`) — confirm they are static here.
2. Tap `PLAY` → a beep, the HUD appears (`000000` left, two `✈` right), stars start scrolling, and the glider sits near the bottom.
3. Hold the left half of the black area → the glider slides left and stops at the edge. Hold the right half → the same to the right. Release → it stops.
4. Desktop: ← / → and A / D move it identically.
5. Press `✕` → back to the lobby. In the console, `apRafHandle` is `null`.
6. Re-enter via the `🕹️` tile → attract screen again.
7. Switch browser tabs mid-play for 10 seconds, come back. Expected: the glider is where you left it, running at normal speed — **not** teleported and not double-speed.

- [ ] **Step 9: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): Asherplane canvas harness — loop, states and input

Real RAF loop with a clamped delta, an attract/playing state machine, a
procedurally drawn glider, a scrolling star field and the HUD.

Movement is a single pointer path on #ap-stage: during play, whichever
half of the stage is held steers, so a thumb never has to find a button;
on menu screens the same tap is hit-tested against drawn button rects.
Arrow keys and A/D mirror it for desktop.

apRafHandle is treated as a timer per logic-engine.md — cancelled on the
exit button, in resetArcade() (which resetToLobby() calls), on every exit
from 'playing', and on visibilitychange when the tab is hidden.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Gameplay — auto-fire, cars, collisions, lives, difficulty

Turns the moving glider into a game.

**Files:**
- Modify: `js/arcade/asherplane.js` (extend `apUpdate` and `apDraw`, add spawner/collision/particles)

**Interfaces:**
- Consumes: `apPlayer`, `apBullets`, `apCars`, `apParts`, `apScore`, `apLives`, `apShake`, `apInvuln`, `AP_SOUND`, `apEnterState` (all from Task 4)
- Produces: `apAABB(a, b)`, `apSpawnInterval()`, `apCarSpeed()`, `apSpawnCar()`, `apBurst(x, y, colour)`, `apDrawCar(car)`

- [ ] **Step 1: Add the difficulty curve, spawner and collision helper**

Append to `js/arcade/asherplane.js`:

```js
// ── Difficulty — both curves are clamped so it gets harder, never impossible.
// At +10/car: score 100 => ~780 ms spawns; score 500 => the 280 ms floor.
function apSpawnInterval() { return Math.max(280, 900 - apScore * 1.2); }
function apCarSpeed()      { return 70 + Math.min(90, apScore * 0.35); }

function apSpawnCar() {
  apCars.push({
    x: 8 + Math.random() * (AP_W - 44),
    y: -50,
    w: 28,
    h: 44,
    speed: apCarSpeed() * (0.85 + Math.random() * 0.4),
    colour: AP_CAR_COLOURS[Math.floor(Math.random() * AP_CAR_COLOURS.length)],
  });
}

// Axis-Aligned Bounding Box overlap. apPlayer.x is a CENTRE; cars and bullets
// use a top-left origin, so the player is converted before comparing.
function apAABB(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function apPlayerBox() {
  return { x: apPlayer.x - apPlayer.w / 2, y: apPlayer.y - apPlayer.h / 2,
           w: apPlayer.w, h: apPlayer.h };
}

function apBurst(x, y, colour) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 120;
    apParts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                   life: 0.45 + Math.random() * 0.25, max: 0.7, colour });
  }
}
```

- [ ] **Step 2: Replace `apUpdate` with the full version**

```js
function apUpdate(dt) {
  // Player
  const keyDir = (apKeys.right ? 1 : 0) - (apKeys.left ? 1 : 0);
  const dir    = keyDir !== 0 ? keyDir : apDir;
  apPlayer.x  += dir * AP_PLAYER_SPEED * dt;
  const half   = apPlayer.w / 2;
  apPlayer.x   = Math.max(half, Math.min(AP_W - half, apPlayer.x));
  if (apShake  > 0) apShake  = Math.max(0, apShake - dt);
  if (apInvuln > 0) apInvuln = Math.max(0, apInvuln - dt * 1000);

  // Auto-fire — nothing to press.
  apFireT += dt * 1000;
  if (apFireT >= AP_FIRE_MS) {
    apFireT = 0;
    apBullets.push({ x: apPlayer.x - 2, y: apPlayer.y - 18, w: 4, h: 11 });
  }
  apBullets.forEach(b => { b.y -= AP_BULLET_SPEED * dt; });
  apBullets = apBullets.filter(b => b.y + b.h > 0);

  // Spawning
  apSpawnT += dt * 1000;
  if (apSpawnT >= apSpawnInterval()) { apSpawnT = 0; apSpawnCar(); }
  apCars.forEach(c => { c.y += c.speed * dt; });
  apCars = apCars.filter(c => c.y < AP_H + 60);

  // Dart hits car
  for (let i = apCars.length - 1; i >= 0; i--) {
    const car = apCars[i];
    for (let j = apBullets.length - 1; j >= 0; j--) {
      if (!apAABB(apBullets[j], car)) continue;
      apBurst(car.x + car.w / 2, car.y + car.h / 2, car.colour);
      AP_SOUND.explode();
      apCars.splice(i, 1);
      apBullets.splice(j, 1);
      apScore += 10;
      break;
    }
  }

  // Car hits player
  if (apInvuln <= 0) {
    const box = apPlayerBox();
    for (let i = apCars.length - 1; i >= 0; i--) {
      if (!apAABB(box, apCars[i])) continue;
      apBurst(apCars[i].x + apCars[i].w / 2, apCars[i].y + apCars[i].h / 2, apCars[i].colour);
      apCars.splice(i, 1);
      apLives -= 1;
      apShake  = 0.35;
      apInvuln = AP_INVULN_MS;
      AP_SOUND.hit();
      if (apLives <= 0) { AP_SOUND.gameOver(); apEndRun(); return; }
      break;
    }
  }

  // Particles
  apParts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
  apParts = apParts.filter(p => p.life > 0);
}

// Placeholder until Task 6 adds the leaderboard. Task 6 replaces this whole
// function — do not build on it.
function apEndRun() {
  apEnterState('attract');
}
```

- [ ] **Step 3: Add car and bullet drawing, and wire them into `apDraw`**

Add the car renderer:

```js
// Top-down toy car. Deliberately generic — a coloured body, two light windows
// and four dark tyres. No branding, no badges.
function apDrawCar(car) {
  const g = apCtx, x = car.x, y = car.y, w = car.w, h = car.h;
  g.fillStyle = '#0B0B0B';
  g.fillRect(x - 3,     y + 6,      4, 11);
  g.fillRect(x + w - 1, y + 6,      4, 11);
  g.fillRect(x - 3,     y + h - 17, 4, 11);
  g.fillRect(x + w - 1, y + h - 17, 4, 11);
  g.fillStyle = car.colour;
  g.fillRect(x, y + 3, w, h - 6);
  g.fillRect(x + 3, y, w - 6, h);
  g.fillStyle = 'rgba(255,255,255,0.72)';
  g.fillRect(x + 5, y + 8,      w - 10, 8);
  g.fillRect(x + 5, y + h - 18, w - 10, 7);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(x + 5, y + 20, w - 10, h - 40);
}
```

Then in `apDraw`, replace the `if (apState === 'playing') { ... }` branch body with:

```js
  if (apState === 'playing') {
    apCars.forEach(apDrawCar);
    apCtx.fillStyle = '#FDE68A';
    apBullets.forEach(b => apCtx.fillRect(b.x, b.y, b.w, b.h));
    apDrawGlider(apPlayer.x, apPlayer.y, apInvuln > 0 && Math.floor(apInvuln / 100) % 2 === 0);
    apParts.forEach(p => {
      apCtx.globalAlpha = Math.max(0, p.life / p.max);
      apCtx.fillStyle   = p.colour;
      apCtx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    apCtx.globalAlpha = 1;
    apDrawHud();
  } else if (apState === 'attract') {
```

- [ ] **Step 4: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 5: Manual browser checkpoint**

1. `PLAY` → darts fire upward automatically at a steady rate, with no sound per shot.
2. Cars fall from the top in mixed colours at mixed speeds, each with visible windows and tyres.
3. A dart hitting a car removes both, plays a low beep, throws a coloured particle burst, and the score climbs by 10.
4. Flying into a car: the screen shakes, one `✈` disappears, a lower beep plays, the glider flashes for about 1.5 s and passes through cars harmlessly during the flash.
5. Take a second hit → a game-over beep and a return to the attract screen (the placeholder — Task 6 replaces it).
6. Survive ~60 seconds. Cars visibly get faster and more frequent, and it stays winnable.
7. Console: after several minutes of play, `apCars.length`, `apBullets.length` and `apParts.length` all stay small (roughly under 40). Growth means an off-screen filter is broken.

- [ ] **Step 6: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): Asherplane gameplay — auto-fire, cars, hits and ramp

Auto-firing darts at 200 ms, generic top-down toy cars in five colours at
mixed speeds, AABB collisions both ways, particle bursts, screenshake, two
lives and a 1.5 s invulnerable flash.

Both difficulty curves are clamped: spawns tighten from 900 ms to a 280 ms
floor and car speed rises by at most 90 px/s, so it gets harder without
becoming unwinnable for a child.

apEndRun() is a placeholder returning to attract; Task 6 replaces it with
the leaderboard flow.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Session leaderboard, initials picker, and docs closure

Adds the arcade endgame and closes the documentation.

**Files:**
- Modify: `js/arcade/asherplane.js` (replace `apEndRun`, add name entry + leaderboard states)
- Modify: `docs/decision-log.md` (one entry at the top)
- Modify: `CLAUDE.md` (short pointer in § Current Focus)

**Interfaces:**
- Consumes: `apLeaderboard`, `apEnterState`, `apDrawButton`, `apHit`, `apToLogical`, `AP_SOUND`, `apScore`
- Produces: `apQualifies(score)`, `apSubmitScore(name, score)`, `AP_SLOTS`, `AP_BTN_OK`, `AP_BTN_AGAIN`

- [ ] **Step 1: Add the leaderboard logic**

```js
// ── Session leaderboard ──────────────────────────────────────────────────────
// Top 5, memory only. Survives resetToLobby() (see resetSecretMode's carve-out)
// but not a page reload — "scores last the afternoon, not forever".
const AP_TOP_N = 5;

function apQualifies(score) {
  if (score <= 0) return false;
  if (apLeaderboard.length < AP_TOP_N) return true;
  return score > apLeaderboard[apLeaderboard.length - 1].score;
}

function apSubmitScore(name, score) {
  apLeaderboard.push({ name, score });
  apLeaderboard.sort((a, b) => b.score - a.score);
  apLeaderboard = apLeaderboard.slice(0, AP_TOP_N);
}

// Three tap-cycling A-Z slots. No <input> anywhere: an iOS keyboard popping up
// over the canvas rescales the whole stage, which is the failure this avoids.
const AP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let apInitials = [0, 0, 0];

const AP_SLOTS = [
  { x:  60, y: 300, w: 66, h: 84 },
  { x: 147, y: 300, w: 66, h: 84 },
  { x: 234, y: 300, w: 66, h: 84 },
];
const AP_BTN_OK    = { x: 80, y: 430, w: 200, h: 62 };
const AP_BTN_AGAIN = { x: 60, y: 500, w: 240, h: 62 };
```

- [ ] **Step 2: Replace the `apEndRun` placeholder**

```js
function apEndRun() {
  if (apQualifies(apScore)) {
    apInitials = [0, 0, 0];
    AP_SOUND.highScore();
    apEnterState('nameEntry');
  } else {
    apEnterState('leaderboard');
  }
}
```

`apEnterState` calls `apResetRun()` only when entering `'playing'`, so `apScore` survives into both of these screens. Do not move that call.

- [ ] **Step 3: Draw the two new screens**

```js
function apDrawNameEntry() {
  const g = apCtx;
  g.textAlign = 'center';
  g.fillStyle = '#FDE68A';
  g.font = 'bold 26px monospace';
  g.fillText('NEW HIGH SCORE!', AP_W / 2, 170);
  g.fillStyle = '#4ADE80';
  g.font = 'bold 34px monospace';
  g.fillText(String(apScore).padStart(6, '0'), AP_W / 2, 215);
  g.font = '12px monospace';
  g.fillText('TAP A LETTER TO CHANGE IT', AP_W / 2, 260);
  AP_SLOTS.forEach((r, i) => {
    g.strokeStyle = '#4ADE80';
    g.lineWidth = 3;
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#4ADE80';
    g.font = 'bold 44px monospace';
    g.textBaseline = 'middle';
    g.fillText(AP_ALPHABET[apInitials[i]], r.x + r.w / 2, r.y + r.h / 2 + 2);
    g.textBaseline = 'alphabetic';
  });
  apDrawButton(AP_BTN_OK, 'OK');
}

function apDrawLeaderboard() {
  const g = apCtx;
  g.textAlign = 'center';
  g.fillStyle = '#4ADE80';
  g.font = 'bold 24px monospace';
  g.fillText('HIGH SCORES', AP_W / 2, 130);
  g.font = '13px monospace';
  g.fillStyle = '#94A3B8';
  g.fillText(`THIS RUN: ${String(apScore).padStart(6, '0')}`, AP_W / 2, 158);
  g.font = 'bold 20px monospace';
  if (apLeaderboard.length === 0) {
    g.fillStyle = '#334155';
    g.font = '14px monospace';
    g.fillText('NO SCORES YET', AP_W / 2, 250);
  }
  apLeaderboard.forEach((e, i) => {
    const y = 210 + i * 38;
    g.fillStyle = i === 0 ? '#FDE68A' : '#4ADE80';
    g.textAlign = 'left';
    g.fillText(`${i + 1}. ${e.name}`, 80, y);
    g.textAlign = 'right';
    g.fillText(String(e.score).padStart(6, '0'), AP_W - 80, y);
  });
  apDrawButton(AP_BTN_AGAIN, 'PLAY AGAIN');
}
```

Then add both branches to `apDraw`, after the existing `attract` branch:

```js
  } else if (apState === 'attract') {
    apDrawAttract();
  } else if (apState === 'nameEntry') {
    apDrawNameEntry();
  } else if (apState === 'leaderboard') {
    apDrawLeaderboard();
  }
```

- [ ] **Step 4: Extend the pointer handler for the new states**

In `apStagePointer`, replace the block after `if (phase !== 'down') return;`:

```js
  if (phase !== 'down') return;
  const p = apToLogical(e);
  if (apState === 'attract' && apHit(AP_BTN_PLAY, p)) {
    AP_SOUND.select();
    apEnterState('playing');
    return;
  }
  if (apState === 'nameEntry') {
    for (let i = 0; i < AP_SLOTS.length; i++) {
      if (!apHit(AP_SLOTS[i], p)) continue;
      apInitials[i] = (apInitials[i] + 1) % AP_ALPHABET.length;
      AP_SOUND.select();
      return;
    }
    if (apHit(AP_BTN_OK, p)) {
      AP_SOUND.select();
      apSubmitScore(apInitials.map(i => AP_ALPHABET[i]).join(''), apScore);
      apEnterState('leaderboard');
    }
    return;
  }
  if (apState === 'leaderboard' && apHit(AP_BTN_AGAIN, p)) {
    AP_SOUND.select();
    apEnterState('playing');
  }
```

- [ ] **Step 5: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 6: Manual browser checkpoint**

1. Play and die with a score above 0. Expected: `NEW HIGH SCORE!`, the score, and three `A` slots.
2. Tap the first slot four times → `E`. Tap the third slot once → `B`. Each tap beeps.
3. Tap `OK` → the leaderboard shows `1. AAB` (or whatever you set) with the score right-aligned, plus `PLAY AGAIN`.
4. `PLAY AGAIN` → a fresh run at `000000` with two lives.
5. Score higher than the first run, die, enter different initials. Expected: the new score is rank 1 and the old one drops to rank 2.
6. Die with a score of exactly 0 (fly into a car twice immediately). Expected: no name entry — straight to the leaderboard, which still shows the earlier entries.
7. Press `✕` → lobby → tap `🕹️` → `[1] ASHERPLANE` → die → the leaderboard **still holds** the earlier scores. This is the `resetSecretMode()` carve-out working.
8. Fill all five slots, then score lower than 5th place. Expected: no name entry, and the table stays at five rows.
9. Hard-reload → the scores are gone and the arcade is locked. Correct.

- [ ] **Step 7: Add the decision-log entry**

Prepend to the entry list in `docs/decision-log.md` (newest on top — match the existing entry format exactly):

```markdown
### 2026-08-03 — Arcade Mode added behind Secret Mode; cabinets are not Sylly Games
Secret Mode gains a third content type: **arcade cabinets** — small standalone canvas
games, listed under a new `ARCADE` category placed **first**, ahead of WORD PACKS and
GAME SKINS. Cabinets are neither packs (they modify no host game, so they get
`smLaunchArcade()` beside an untouched `smLaunch()`) nor Sylly Games (no MP config, no
`game-identities.md` section, no Sylly Mode, no `new-game-checklist.md`, not the Stack).
First cabinet: **Asherplane**, `js/arcade/asherplane.js`. A session-sticky unlock puts a
`🕹️` tile on the lobby which routes through `smOpenArcadeMenu()` — deliberately never
awaiting `smLoadPacks()`, so the arcade opens on a cold offline start. Spec:
`docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md`.
```

- [ ] **Step 8: Add the CLAUDE.md pointer**

Insert immediately above the `## 🎯 Current Focus` heading's existing body, as its own short paragraph:

```markdown
**Side project — Arcade Mode (3 Aug 2026).** Secret Mode now holds **arcade cabinets**
alongside word packs and skins: small standalone canvas games under a new `ARCADE`
category, first in the terminal list. **Cabinets are NOT Sylly Games and NOT packs** —
no MP config, no `game-identities.md` section, no Sylly Mode, no verification harness,
and explicitly not `docs/rules/new-game-checklist.md`. They use the terminal's CRT
green-on-black language, not the Stack or the brand palette. First cabinet:
**Asherplane** (`js/arcade/asherplane.js`), a top-down shmup. Adding cabinet #2 = one
`SM_ARCADE` entry + one file. Spec:
`docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md`; plan:
`docs/superpowers/plans/2026-08-03-arcade-asherplane.md`.
```

- [ ] **Step 9: Commit**

```bash
git add js/arcade/asherplane.js docs/decision-log.md CLAUDE.md
git commit -m "feat(arcade): Asherplane session leaderboard and initials picker

Top-5 in-memory leaderboard with a three-slot tap-cycling A-Z picker. No
<input> anywhere: an iOS keyboard opening over the canvas rescales the
whole stage, which is the failure this avoids.

Scores survive a trip to the lobby via the resetSecretMode() carve-out
but not a page reload, which is the intended lifetime.

Closes the docs: one decision-log entry and a CLAUDE.md pointer recording
that cabinets are exempt from the new-game process.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Final verification (spec § 9)

Run the whole sequence on a **real iPad**, not a desktop emulator — touch behaviour and the DPR path are the two things a desktop cannot honestly check.

- [ ] Konami code → terminal shows `[1] ARCADE` first
- [ ] `[1] ARCADE` → `[1] ASHERPLANE` → the game starts
- [ ] Both halves of the screen steer; auto-fire works; cars explode; the score climbs
- [ ] Two hits → game over → name entry → leaderboard → PLAY AGAIN
- [ ] `✕` → lobby → `🕹️` present → cabinet list → the leaderboard still holds earlier scores
- [ ] A second, higher run sorts to rank 1
- [ ] Home-screen the app mid-run, return: the loop resumes at normal speed
- [ ] Hard reload: the tile is gone and the arcade is locked
- [ ] Offline cold start: the `🕹️` path still opens the cabinet list
- [ ] Regression: WORD PACKS and GAME SKINS still launch their games correctly
- [ ] Regression: every other game still reaches its menu from the lobby (`allScreens[]` edit)
