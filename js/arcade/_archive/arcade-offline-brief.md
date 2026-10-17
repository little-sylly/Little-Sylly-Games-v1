# Little Sylly Arcade — OFFLINE BRIEF

> **For Claude:** Sam is pasting/attaching this because the `arcade` folder is NOT linked to this chat. You can't see `asherplane.js`, `minesweeper.js`, `chicken.js`, `slice.js`, `cookiejar.js`, `stacking.js`, `bluff.js` or `index.html` — everything you need to match them is in this file. Don't ask Sam to paste the other cabinets unless something here is genuinely missing.
>
> **For Sam:** attach this file at the start of an offline chat. Update the **Status** section below when cabinets change. When the folder is linked again, the normal `CLAUDE.md` takes over and Claude migrates the offline work in.

---

## What the arcade is
A secret back door in **Little Sylly Games** (a free, mobile-first PWA party game suite) opens a menu of small single-player arcade games ("cabinets"). Cabinets are short, fun, kid-friendly, and complement the party games — some are set in a Sylly game's world (e.g. Chop Salad lives in Fruit Salad's world). Each cabinet is one vanilla-JS file. They're built and play-tested in a workshop folder first, then dropped into the real codebase.

**Sam is a non-coder** working with Claude as design + implementation partner. Explain choices in plain words; keep code tidy and commented so a future Claude can pick it up.

## Status (update me)
| # | Cabinet | Prefix | File | Style | State |
|---|---|---|---|---|---|
| 01 | Asherplane | `ap` | asherplane.js | vertical shmup over a sea of islands, revamped Oct 2026: drag to fly in 2D, auto-fire, small hit core; five skies each a clear difficulty step + a new Bandit (MORNING Darts/Swoopers/Bombers → MIDDAY Copters → SUNSET Divers → NIGHT Aces → TWILIGHT nightmare where Bandits bite back), each ending in a unique boss (BIG BLIMP, BUZZ BROTHERS, IRONCLAD, NIGHT OWL, DREAD BARON), then TWILIGHT 2, 3… forever; parachute crates POWER / SHIELD / WINGMEN / KABOOM / HEART; STAR CHAIN multiplier; tap the title for a play-test warp; keeps v1's `apStart` / `resetArcade` / `apLeaderboard` names. Old cars version in `_archive/asherplane-classic.js` | built, needs phone play-test (real game still has v1) |
| 02 | Deep-Sea Sweep | `ms` | minesweeper.js | classic Minesweeper (9×9/10, 10×14/22, 12×17/40; first dig always safe; press-and-hold flips dig↔flag) reskinned into Deep-Sea Deploy's (`dsd`) world: water squares over seabed sand, horned sea mines, red marker BUOYS for flags, sonar PING for dig, Captain reset face, Sea States CALM/TURBULENT/TEMPEST; SPLOOSH!, ALL CLEAR!, MISSION DEBRIEF, DEPLOY AGAIN; anchor-and-urchins sticker on the attract screen | rules play-tested; reskin needs phone play-test |
| 03 | Other Side | `ck` | chicken.js | "why did the chicken cross the road?" endless lane-hopper (Crossy Road/Frogger) | done, play-tested |
| 04 | Chop Salad | `sl` | slice.js | Fruit Ninja rules in Fruit Salad's (`frt`) world: swipe to slice, 3+ = combo, drop 3 = out, slice the broccoli = out, a strike back every 100 pts. Glowed up Oct 2026: teal picnic gingham, electric lemon `#FFE500` + dark ink UI, bigger fruit, slash/juice FX; start-screen toggle PLAIN / PERSONALITIES — the Fruity Personalities drawn in code (`SL_CHARS`, cosmetic only, session memory). Words like FRUIT LOOPED, VEGETABLES?!, FRUIT SALAD! (5-combo), ORANGE YOU GLAD IT'S OVER? Fruit art all goes through `slDrawWhole`/`slDrawHalf`; old version in `_archive/slice-classic.js` | glowed up, needs phone play-test |
| 05 | Hand in the Cookie Jar | `hj` | cookiejar.js | hold-to-grab push-your-luck in the Cookie Jar (`cjar`) world: 5 family visitors with different tells, Handful/Batch/Mountain tiers, Special Treats, Red-Handed; a dinner clock that brave late escapes push back (CLOSE SHAVE / SNEAKY); the arm reaches in through the jar's mouth and digs, bigger as the haul grows (`HJ_DIG`) | built, needs phone play-test |
| 06 | Stacking Order | `sto` | stacking.js | Stack/Tower Bloxx with Pecking Order's (`pko`) 13 animals; PERFECT/lean/collapse; bonus for predator-on-prey | built, needs phone play-test |
| 07 | Beyond the Bluff | `bb` | bluff.js | Doodle Jump-style auto-hop climb up a dice-face sea cliff in The Bluff's (`dyb`) world: drag to steer, screen wrap; pips are holds (RAISE / BLUFF crumbles / SLICK); rockfall Cracked 50 m, Loaded 100 m, Phantom 150 m, Snake 200 m; 5 dice in the cup as lives; The Depths rise; score in metres; THE PLUNGE / INTO THE DEPTHS / SIGN THE LOG / THE ASCENT | built, needs phone play-test |
| — | Music game | ? | ? | ? | parked |

**Prefixes already taken** (never reuse): arcade `ap ms ck sl hj sto bb`; suite games `frt cjar pko bld nt rtr gon pas gth cld dyb`. Pick a new 2–3 letter prefix and add it to the table. Also taken: `hsg`, `fyfi`. Check with Sam if unsure.

---

## Rules for every cabinet
- **No assets.** All art drawn in code on a canvas. All sound is `playSecretBeep(freq)`. No image/audio files, no libraries, no CDNs. Vanilla JS.
- **Not a Sylly Game.** No multiplayer, no settings, no Sylly Mode. (A purely cosmetic choice, like Chop Salad's fruit-art toggle, is fine.)
- **Prefix everything global** (`xx` below = your new prefix; `XX_` for constants).
- **Fixed 360×640 logical canvas**, portrait, letterboxed into its stage. All drawing in logical coords.
- **DOM:** screen `screen-arcade-<name>`, a `#xx-stage` pointer target (`touch-action:none`) wrapping `#xx-canvas`, and a `#btn-xx-exit` button.
- **One RAF loop**, dt clamped to 0.05s, freezes while `#sound-overlay` is showing, stops when the tab is hidden.
- **No setTimeout.** Delayed effects go in an `xxEvents` list scheduled against a game clock (`xxClock`) and run inside the loop, so cancelling the loop *is* the teardown.
- **Teardown** `resetArcade<Name>()`: cancel loop, clear pointer/press state, events, particles, shake. The real `resetToLobby()` calls it. **Don't** clear the high-score table.
- **A sound map** `XX_SOUND` of named moments → `playSecretBeep`. Always include `select` (660) and `highScore` (1046).
- **Menus are drawn on the canvas** and hit-tested against `{x,y,w,h}` rects. No `<input>` (iOS keyboard rescales the stage).
- **Session high scores:** top 5, three tap-to-cycle initials (A–Z), in memory only — survive returning to the lobby, gone on reload.
- **Mobile-first, kid-friendly:** big tap targets (≥ ~54px tall), one pointer at a time (ignore a second finger), keyboard/mouse as a desktop bonus. Buttons fire on press.
- **Title is a constant** (`XX_TITLE`) so the cabinet can be renamed in one place.
- **State machine:** `attract → playing → (dying/over beat) → nameEntry (if qualifies) → leaderboard → playing | attract`.

## House look (arcade default palette — from the classic Asherplane and Minesweeper)
```js
const XX_BG = '#05070D', XX_GREEN = '#4ADE80', XX_YELLOW = '#FDE68A',
      XX_GREY = '#94A3B8', XX_DIM = '#64748B', XX_RED = '#F87171', XX_FRAME = '#1E3A5F';
const XX_CONFETTI = ['#E63946', '#FFB703', '#52B788', '#9B5DE5', '#00B4D8', '#FDE68A'];
```
Text is `bold Npx monospace`, centred. A cabinet set in a Sylly game's world may swap in that game's palette and vocabulary (like Chop Salad does).

---

## Cabinet skeleton (copy, rename `xx`/`XX`/`<Name>`, fill in the game)
```js
// ═══════════════════════════════════════════════════════════════════════════
// <name>.js — ARCADE CABINET 0N. <one-line pitch>. Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep)
//  - Prefix `xx`. Screen id: screen-arcade-<name>. DOM: #xx-stage (pointer
//    target, touch-action:none) wrapping #xx-canvas, plus #btn-xx-exit.
//  - engine.js resetToLobby() should call resetArcade<Name>() beside resetArcade().
//  - NO setTimeouts: every delayed effect is scheduled on xxClock via xxEvents.
// ═══════════════════════════════════════════════════════════════════════════
const XX_W = 360, XX_H = 640;
const XX_TITLE = 'WORKING TITLE';
const XX_TOP_N = 5;

const XX_SOUND = {
  select:    () => playSecretBeep(660),
  highScore: () => playSecretBeep(1046),
  // add moments: e.g. hit: () => playSecretBeep(523), over: () => playSecretBeep(98),
};
const XX_OVER_JINGLE = [523, 392, 330, 262];

// Layout rects (logical px)
const XX_BTN_PLAY     = { x: 40,  y: 430, w: 280, h: 64 };
const XX_SLOTS = [ { x: 60, y: 300, w: 66, h: 84 }, { x: 147, y: 300, w: 66, h: 84 }, { x: 234, y: 300, w: 66, h: 84 } ];
const XX_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const XX_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const XX_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

let xxCanvas = null, xxCtx = null;
let xxRafHandle = null, xxLastT = 0;
let xxState = 'attract';   // attract | playing | over | nameEntry | leaderboard
let xxClock = 0;           // ms of un-paused time
let xxEvents = [];         // [{ at, fn }] — replaces setTimeout
let xxParts = [];
let xxShake = 0;
let xxScore = 0, xxLastScore = 0;
let xxPtrId = null;        // the one pointer allowed to act
let xxPress = null;
let xxScores = [];         // session leaderboard — NOT cleared by teardown
const XX_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let xxInitials = [0, 0, 0];

function xxStart() {
  xxCanvas = document.getElementById('xx-canvas');
  xxCtx = xxCanvas.getContext('2d');
  showScreen('screen-arcade-<name>');
  xxResize();
  xxEnterState('attract');
}

function xxEnterState(next) {
  xxState = next;
  if (next === 'playing') xxNewGame();
  xxShake = 0; xxPress = null;
  if (!xxRafHandle) { xxLastT = 0; xxRafHandle = requestAnimationFrame(xxLoop); }
}

function xxNewGame() { xxScore = 0; xxParts = []; xxEvents = []; /* + game state */ }

function xxLoop(now) {
  xxRafHandle = null;
  if (!xxLastT) xxLastT = now;
  const dt = Math.min((now - xxLastT) / 1000, 0.05);
  xxLastT = now;
  const so = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';
  if (!paused) xxUpdate(dt);
  xxDraw();
  if (!xxRafHandle) xxRafHandle = requestAnimationFrame(xxLoop);
}

function xxUpdate(dt) {
  xxClock += dt * 1000;
  if (xxShake > 0) xxShake = Math.max(0, xxShake - dt);
  xxParts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; p.life -= dt; });
  xxParts = xxParts.filter(p => p.life > 0);
  if (xxEvents.length) {
    const due = xxEvents.filter(e => xxClock >= e.at);
    xxEvents  = xxEvents.filter(e => xxClock <  e.at);
    due.forEach(e => e.fn());
  }
  // game logic for xxState === 'playing'
}

function xxGameOver() {
  xxLastScore = xxScore;
  xxState = 'over';
  XX_OVER_JINGLE.forEach((f, k) => xxEvents.push({ at: xxClock + 300 + k * 140, fn: () => playSecretBeep(f) }));
  xxEvents.push({ at: xxClock + 1600, fn: () => {
    if (xxQualifies(xxLastScore)) { xxInitials = [0, 0, 0]; XX_SOUND.highScore(); xxEnterState('nameEntry'); }
    else xxEnterState('leaderboard');
  }});
}

// High scores (higher is better; flip the comparisons for fastest-time games)
function xxQualifies(s) { return xxScores.length < XX_TOP_N || s > xxScores[xxScores.length - 1].score; }
function xxSubmit(name, score) {
  xxScores.push({ name, score });
  xxScores.sort((a, b) => b.score - a.score);
  xxScores = xxScores.slice(0, XX_TOP_N);
}

function xxDraw() {
  const g = xxCtx;
  g.fillStyle = XX_BG; g.fillRect(0, 0, XX_W, XX_H);
  g.save();
  if (xxShake > 0) g.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  // draw by state: attract / playing / over / nameEntry / leaderboard
  g.restore();
}

function xxDrawButton(r, label, size = 22) {
  const g = xxCtx;
  g.strokeStyle = XX_GREEN; g.lineWidth = 3; g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = XX_GREEN; g.font = `bold ${size}px monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  g.textBaseline = 'alphabetic';
}

// Input
function xxToLogical(e) {
  const r = xxCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * XX_W / r.width, y: (e.clientY - r.top) * XX_H / r.height };
}
function xxHit(r, p) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

function xxOnDown(p) {
  if (xxState === 'attract') { if (xxHit(XX_BTN_PLAY, p)) { XX_SOUND.select(); xxEnterState('playing'); } return; }
  if (xxState === 'playing') { /* game input */ return; }
  if (xxState === 'nameEntry') {
    for (let i = 0; i < XX_SLOTS.length; i++) {
      if (xxHit(XX_SLOTS[i], p)) { xxInitials[i] = (xxInitials[i] + 1) % 26; XX_SOUND.select(); return; }
    }
    if (xxHit(XX_BTN_OK, p)) { XX_SOUND.select(); xxSubmit(xxInitials.map(i => XX_ALPHABET[i]).join(''), xxLastScore); xxEnterState('leaderboard'); }
    return;
  }
  if (xxState === 'leaderboard') {
    if (xxHit(XX_BTN_LB_AGAIN, p)) { XX_SOUND.select(); xxEnterState('playing'); return; }
    if (xxHit(XX_BTN_LB_MENU, p))  { XX_SOUND.select(); xxEnterState('attract'); }
  }
}

function xxStagePointer(e, phase) {
  if (phase === 'down') {
    if (xxPtrId !== null) return;           // second finger ignored
    xxPtrId = e.pointerId;
    xxOnDown(xxToLogical(e));
    return;
  }
  if (e.pointerId !== xxPtrId) return;
  if (phase === 'move') { /* drag/swipe handling */ return; }
  xxPtrId = null; xxPress = null;           // up / cancel
}

(function xxBindInput() {
  const stage = document.getElementById('xx-stage');
  stage.addEventListener('pointerdown',  e => { stage.setPointerCapture(e.pointerId); xxStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',  e => { if (e.buttons) xxStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',    e => xxStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => xxStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => xxStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',  e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-<name>').style.display !== 'none';
  document.addEventListener('keydown', e => { if (!visible()) return; /* desktop bonus keys */ });
  document.getElementById('btn-xx-exit').addEventListener('click', () => { resetArcade<Name>(); resetToLobby(); });
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) { if (xxRafHandle) { cancelAnimationFrame(xxRafHandle); xxRafHandle = null; } xxPress = null; xxPtrId = null; }
    else if (!xxRafHandle) { xxLastT = 0; xxRafHandle = requestAnimationFrame(xxLoop); }
  });
})();

// Crisp letterboxing — identical to apResize/msResize
function xxResize() {
  if (!xxCanvas) return;
  const box = xxCanvas.parentElement;
  const scale = Math.min(box.clientWidth / XX_W, box.clientHeight / XX_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  xxCanvas.style.width  = Math.floor(XX_W * scale) + 'px';
  xxCanvas.style.height = Math.floor(XX_H * scale) + 'px';
  xxCanvas.width  = Math.floor(XX_W * scale * dpr);
  xxCanvas.height = Math.floor(XX_H * scale * dpr);
  xxCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function resetArcade<Name>() {
  if (xxRafHandle) { cancelAnimationFrame(xxRafHandle); xxRafHandle = null; }
  xxState = 'attract'; xxPress = null; xxPtrId = null;
  xxEvents = []; xxParts = []; xxShake = 0;
  // xxScores is NOT cleared — session high scores survive the lobby.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-<name>').style.display !== 'none') xxResize();
});
```

---

## Offline play-test page (so Sam can try it on a phone without the folder)
When offline, deliver **two things**:
1. `<name>.js` — the clean drop-in cabinet file.
2. A **standalone single-file HTML preview**: the shell below with the cabinet's code pasted inline (no `<script src>`). Publish it as an artifact so Sam gets a phone-testable link.

```html
<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Sylly Arcade Bench</title>
<style>
  :root { --bg:#05070D; --green:#4ADE80; --yellow:#FDE68A; --grey:#94A3B8; --dim:#64748B; --line:#1E3A5F;
          --mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; color-scheme: dark; }
  html, body { height:100%; }
  body { margin:0; background:var(--bg); color:var(--green); font-family:var(--mono); overflow:hidden; }
  button { font:inherit; color:inherit; background:none; border:0; cursor:pointer; }
  .screen { position:fixed; inset:0; box-sizing:border-box; flex-direction:column;
    padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px);
    padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); }
  #screen-lobby { align-items:center; justify-content:center; }
  .lobby { width:100%; max-width:360px; display:flex; flex-direction:column; gap:28px; }
  .cab { display:flex; align-items:center; gap:14px; padding:16px 18px; text-align:left; border:3px solid var(--green); }
  .cab:active { background:var(--green); color:var(--bg); }
  .cab .no { font-size:13px; color:var(--yellow); } .cab .name { font-size:20px; font-weight:700; flex:1; }
  #btn-mute { align-self:flex-start; padding:8px 0; color:var(--grey); font-size:12px; letter-spacing:.12em; }
  .arcade-bar { flex:none; height:44px; display:flex; align-items:center; gap:12px; }
  .arcade-exit { width:44px; height:44px; font-size:22px; color:var(--grey); margin-left:-10px; }
  .arcade-title { font-size:12px; letter-spacing:.14em; color:var(--dim); }
  .arcade-stage { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; padding-bottom:8px;
    touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
  .arcade-stage canvas { display:block; }
</style></head>
<body>
<div id="screen-lobby" class="screen" style="display:flex">
  <div class="lobby">
    <h1 style="margin:0;font-size:28px">LITTLE SYLLY<br>ARCADE</h1>
    <button class="cab" id="btn-open-xx" type="button"><span class="no">0N</span><span class="name">WORKING TITLE</span><span>▸</span></button>
    <button id="btn-mute" type="button">SOUND: ON</button>
  </div>
</div>
<div id="screen-arcade-<name>" class="screen" style="display:none">
  <div class="arcade-bar">
    <button id="btn-xx-exit" class="arcade-exit" type="button" aria-label="Exit to arcade">✕</button>
    <span class="arcade-title">CABINET 0N</span>
  </div>
  <div id="xx-stage" class="arcade-stage"><canvas id="xx-canvas"></canvas></div>
</div>
<script>
  // Stand-ins for the suite's engine.js / secret-mode.js
  function showScreen(id) { document.querySelectorAll('.screen').forEach(s => { s.style.display = s.id === id ? 'flex' : 'none'; }); }
  function resetToLobby() { showScreen('screen-lobby'); }
  let benchAudio = null, benchMuted = false;
  function playSecretBeep(freq) {          // NES-style square blip
    if (benchMuted) return;
    try {
      benchAudio = benchAudio || new (window.AudioContext || window.webkitAudioContext)();
      if (benchAudio.state === 'suspended') benchAudio.resume();
      const t = benchAudio.currentTime, osc = benchAudio.createOscillator(), amp = benchAudio.createGain();
      osc.type = 'square'; osc.frequency.value = freq;
      amp.gain.setValueAtTime(0.05, t); amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(amp).connect(benchAudio.destination); osc.start(t); osc.stop(t + 0.1);
    } catch (e) {}
  }
</script>
<script>
// ── <name>.js inlined here (keep in sync with the .js file) ──
</script>
<script>
  document.getElementById('btn-open-xx').addEventListener('click', () => xxStart());
  document.getElementById('btn-mute').addEventListener('click', e => {
    benchMuted = !benchMuted; e.currentTarget.textContent = benchMuted ? 'SOUND: OFF' : 'SOUND: ON';
  });
</script>
</body></html>
```
Note: the real `playSecretBeep` is a single short blip (~0.1s) at the given frequency. A "jingle" is several beeps scheduled on the game clock, not one long note — keep that in mind for the music game.

---

## Offline workflow
1. **Brainstorm** — pitch, rules, a kid-friendly twist, which Sylly world (if any) it borrows, name + prefix. Keep it a 1–3 minute "one more go" game.
2. **Build** `<name>.js` from the skeleton + the preview HTML. Headless sanity checks where possible.
3. **Phone play-test** via the artifact link: start, play, lose, score, high-score entry, leaderboard, exit, re-enter, tab-away.
4. **Hand-off note** — end the chat with a short block Sam can paste into the linked session:
   ```
   OFFLINE HAND-OFF — Cabinet 0N <TITLE> (prefix xx)
   Files: <name>.js (attached/saved to arcade folder)
   State: built / play-tested / needs X
   Decisions: …
   Open questions: …
   ```

## Migrating back in (when the folder is linked again)
1. Save `<name>.js` into the `arcade` folder.
2. In `index.html` (the real bench): add the cabinet's `screen-arcade-<name>` markup beside the others, paste its code as an inline `<script>` block ("`<name>.js`, inlined so this page runs on its own (keep in sync)"), wire `btn-open-xx` in the final script, and move it from "Up next" to "Playable" in the lobby. **Keep index.html self-contained — no `<script src>`.**
3. Update `CLAUDE.md` (Files + Cabinet list) and the Status table in this file.
4. Re-run the play-test checklist and check the console.

*Keep this file in step with `CLAUDE.md` — if the rules change there, change them here.*
