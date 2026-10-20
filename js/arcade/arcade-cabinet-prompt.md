# Prompt: Build a Little Sylly Arcade Cabinet (offline)

**Use with:** any chat that has **no access to this repo** — the Claude app, a phone, a fresh session
with no project folder attached.
**Output goes into:** `js/arcade/<id>.js`, plus the seams in Step 6.
**Where this file lives:** `js/arcade/` for now, so it is easy to grab. **It moves to
`docs/content-prompts/` once it has settled** — nothing links to it by path, so the move is free.

**How to use it:** paste this whole file into the offline chat as the first message, then
**`arcade-roster.md`** as the second, then say which game you want (or paste its brief). Together
they're self-contained and assume the chat can see *nothing* else.

**Two files, two jobs:**
- **This prompt** says how to design and build a cabinet: the rules, the skeleton, the soft design
  guidelines, the hand-off.
- **`arcade-roster.md`** is the running list of what exists: every cabinet and its world and status
  (idea, brief, built, shipped), plus every prefix that's taken. Update the roster whenever a
  cabinet's status changes. This prompt only changes when the way we build changes.

---

## What the arcade is

A room in the Little Sylly house: **the Arcade** (a 🕹️ door in every lobby layout; always open, no
unlock). It lists **arcade cabinets**; a cabinet's ✕ comes back to that list. A cabinet is a small,
one-more-go canvas game — 1–3 minutes a run, playable with one thumb.

**A cabinet is NOT a Sylly Game and NOT a pack.** No multiplayer, no settings overlay, no Sylly Mode,
no identity doc, no pack manifest, and the new-game checklist does not apply to it. It speaks the
terminal's CRT green-on-black language, or a Sylly game's world if it is set in one.

**What already exists** (every cabinet, its genre, its world and whether it's live) is in
`arcade-roster.md`, not here.

---

## Step 1 — Pick the game, the name and the prefix

Settle these in a short back-and-forth **before any code**:

1. **The pitch** — one line. What the player does, and why they would have one more go.
2. **The arcade ancestor** — name it plainly, and check the roster so it doesn't repeat a genre
   that's already there.
3. **Which Sylly world it borrows, if any.** Several cabinets are a genre reskinned into a real
   game's world, which is a cheap way to make it feel part of the suite. Its own thing in the house
   arcade palette is equally fine.
4. **The kid-friendly twist.** The owner's daughter is the audience — nothing fiddly, nothing cruel.
5. **A name, an `id`, and a two-or-three-letter prefix.** The `id` is the filename and the screen id
   (`js/arcade/<id>.js`, `screen-arcade-<id>`); it need not match the display title — the shipped
   `minesweeper.js` is titled DEEP-SEA SWEEP, and `bluff.js` is BEYOND THE BLUFF.

### ⚠ Prefixes already taken — a new one must collide with NONE of them

The full, current list is in **`arcade-roster.md`**: arcade cabinets, prefixes reserved by briefs,
the 20 Sylly Games, and the lobby / shared modules. Add the new prefix there when you pick it.

Everything in a cabinet is a **global** — the app uses no ES modules, so 20 games and the whole lobby
share one scope. A collision silently clobbers something a dozen screens away, and nothing warns you.
A **sub-namespace under your own prefix is fine and encouraged** for a large art block: Chop Salad
keeps its Fruity Personalities in `SLC_*` / `slc*` beneath `sl`.

---

## Design guidelines — soft, use them where they fit

These are lessons from building the cabinets, most of them from COLD SHOT and TRACE ROUTE (Oct
2026). They are **not rules**; Step 2 has the rules. Use a guideline when it makes the cabinet
better and skip it when it doesn't fit. A calm puzzle like DEEP-SEA SWEEP needs far less madness than a shooter.

1. **A companion, not a demo.** A cabinet set in a Sylly game's world borrows its look, its words
   and one idea. It doesn't replay the party game. A good move is to flip a role, or take one
   element and build a different arcade loop around it. COLD SHOT's first draft was Cold Shoulder
   played solo and felt like a demo. Making you the heckler in the Drink, throwing at the penguins
   on the ice, turned it into its own game.
2. **An arcade loop you get in five seconds.** The score climbs all run, the danger is visible on
   screen (ICE LOAD, The Depths rising), a run lasts 1–3 minutes, and one tap starts another go.
3. **Controls that feel natural.**
   - Things go the way the finger goes: left is left. Avoid a mirrored slingshot unless the fiction
     really is one.
   - Where you touch should mean something (touch where you want to throw), and the very first
     touch should show feedback.
   - Give each input one job. If one drag does two things (aim *and* power), split them so one
     can't knock the other off.
   - Forgive timing: buffer an input made a moment early. A throw released during the re-pack fires
     when it's ready.
   - Try it with a mouse as well as a thumb. A sloppy desktop drag shows up problems a phone hides.
   - For steering, swipes beat buttons. TRACE ROUTE's controls were the stand-out with a kid: a
     swipe of about 24 px anywhere on the stage sets the direction, up to two turns buffer, and
     one drag can chain both (re-anchor the swipe's start point after each turn), so a quick
     double-swipe is a U-turn. A turn that arrives within 90 ms *after* a would-be crash is
     applied anyway. It forgives without feeling like cheating.
4. **Make the skilful input worth it.** If spamming or flicking beats doing it properly, the game
   feels cheap. Add a short cooldown or a power curve (a quick flick is a soft lob; only a full
   wind-up hits hard), and label it on screen (LOB → FULL POWER!).
5. **Variety and escalation.** The biggest jump in fun came from new things arriving. Waves each
   introduce one new kind of enemy with its own look and behaviour, then mix them together. Keep
   every new thing readable at a glance, and introduce it with a banner or callout.
   **Escalate the space, not only the cast.** TRACE ROUTE's first build added one hazard and then
   nothing new, so it stayed open and calm when it should have closed in. What fixed it: state
   that carries between levels (the trace keeps its length, so the arena tightens the way
   late-game snake does), one new element per level with its own boot banner, a timed surge
   near the end of each level (LOCKDOWN), and an enemy that hunts you rather than patrols.
   Ask of every level after the second: what is new here, and is there less room than before?
6. **Power-ups that break your own rules.** Keep them short, all timed, and on the same clock.
   Deliver them in-world (snowball the seagull carrying one), so grabbing one takes skill. Each
   should bend the core limit: no cooldown, three at once, ploughs straight through.
7. **Arcade madness, in proportion.** Go a little over the top: an announcer line for big moments,
   speech bubbles from the characters, hit-stop, a flash, shake, slow motion and confetti, scaled
   to how big the moment is. Show one big line at a time, never block input or hide the danger,
   and keep it kid-friendly. Quieter cabinets get a smaller dose, and none get it on every frame.
   **Translate it into the world's voice rather than dropping it.** A serious world gets the same
   dose in its own register. TRACE ROUTE's announcer is dry system alerts (`>> DAEMON
   TERMINATED`, `>> PACKET CHAIN ×3`) that resolve out of scrambled hex, with hit-stop and a flash
   on the big moments, and still no exclamation marks.
8. **Teach in play.** Show one short coach line the first time each new thing appears, once per
   session. No instructions screen.
   Pair the banner that announces a new thing with a small text box that says what it does, in one
   or two plain sentences. TRACE ROUTE's play-test singled this out: each new element gets a
   boot banner ("NEW PROCESS DETECTED: PATROL DAEMON", with the element drawn as it looks in
   play), then a coach box the first time it shows up ("Patrol Daemon. Head contact terminates
   the trace. Your trail deflects it."). Rules for the box: written in sentence case so a kid can
   read it, in the world's voice, one box at a time (queue the rest), about 5 seconds each, and
   placed away from the player so it never hides the danger.
9. **Tune with numbers.** A headless bot run (Playwright, calling the cabinet's own update loop)
   quickly checks run length and score spread before a phone play-test. Aim for about 1.5–3 minutes
   for an average player. If the bot never runs out of time, the clock isn't a threat yet:
   TRACE ROUTE's windows came down by a third once the bot showed that.
10. **Make a fairness promise and prove it.** If the game promises something (the exit is never
    sealed, nothing lands in front of you), write it as a rule in the code and have a bot run
    count violations over hundreds of events. A check made when something is placed isn't
    enough if it lands later: the player has moved by then. TRACE ROUTE's bot found exactly that.
11. **The front door is part of the game.** The attract screen is the first taste of the world,
    so build it from the world's own material, not a generic title card. TRACE ROUTE types
    Net-Trace's real boot log out on the game clock (a tap skips it) while a demo trace snakes
    round a dim Node behind it, then the title, one line of role, and a button worded in the
    world (INITIALISE ▶). It's the model for how a cabinet's attract screen should feel.
12. **Show the player their own run back.** A few hundred milliseconds replaying what the
    player just did is cheap and very satisfying. TRACE ROUTE redraws the route you took after
    each breach, the way Net-Trace plays back a trace, with the hop count and the latency.
13. **Leave room for the build chat's own ideas.** A brief is a floor, not a ceiling. Given
    little direction, TRACE ROUTE's chat made every visual call from the world itself (its
    palette, its terminal conventions, its real copy) and added touches no brief asked for:
    the route playback, the boot-log front door, the decrypting alerts. Those turned out to be
    the best parts. So:
    - **Briefs** say what the game is, why it's fun and which world it borrows. They name the
      few things that are fixed and leave the look, the feel and the small moments open.
    - **The build chat** treats the world's own material as its source: its documents, UI,
      vocabulary and in-jokes. It adds one or two touches of its own that come from that
      world, and names each one in the hand-off's *Decisions* line so it can be kept or cut.
    - **Reviews** keep what worked, even when it wasn't asked for, and push on what didn't.

---

## Step 2 — The rules every cabinet follows

- **No assets.** All art drawn in code on a canvas. All sound is `playSecretBeep(freq)`. No image or
  audio files, no libraries, no CDNs. Vanilla JS, ES6+.
- **Not a Sylly Game.** No multiplayer, no settings, no Sylly Mode. (A purely *cosmetic* choice, like
  Chop Salad's PLAIN/PERSONALITIES fruit-art toggle, is fine.)
- **Prefix everything global** — `xx` below is your prefix, `XX_` your constants.
- **Fixed 360×640 logical canvas**, portrait, letterboxed into its stage. All drawing in logical coords.
- **DOM:** screen `screen-arcade-<id>`, a `#xx-stage` pointer target (`touch-action:none`) wrapping
  `#xx-canvas`, and a `#btn-xx-exit` button. **`touch-action:none` is load-bearing** — without it the
  browser eats the drag and a drag-steered cabinet is simply unplayable on a phone.
- **One RAF loop**, dt clamped to 0.05 s, frozen while `#sound-overlay` is showing, stopped when the
  tab is hidden.
- **No `setTimeout`.** Every delayed effect goes in an `xxEvents` list scheduled against a game clock
  (`xxClock`) and runs inside the loop — so cancelling the loop *is* the whole teardown.
- **Teardown `resetArcade<Name>()`:** cancel the loop, clear pointer/press state, events, particles,
  shake. **Do NOT clear the high-score table.**
- **A sound map** `XX_SOUND` of named moments → `playSecretBeep`. Always include `select` (660) and
  `highScore` (1046). A "jingle" is several short blips scheduled on the game clock — `playSecretBeep`
  is a single ~0.1 s blip, never a held note.
- **Menus are drawn on the canvas** and hit-tested against `{x,y,w,h}` rects. **No `<input>`** — an iOS
  keyboard rescales the stage.
- **Session high scores:** top 5, three tap-to-cycle initials (A–Z), in memory only. They survive
  returning to the lobby and are gone on reload. "Scores last the afternoon, not forever."
- **Mobile-first, kid-friendly:** big tap targets (≥ ~54 px tall), one pointer at a time (ignore a
  second finger), keyboard/mouse as a desktop bonus. Buttons fire on press.
- **Title is a constant** (`XX_TITLE`) so the cabinet can be renamed in one place.
- **State machine:** `attract → playing → (dying/over beat) → nameEntry (if it qualifies) →
  leaderboard → playing | attract`.

### The only engine functions a cabinet may call

`showScreen(id)` · `resetToLobby()` · `playSecretBeep(freq)` · `arcExitCabinet()` (the ✕ button: back
to the Arcade room) — plus the `isMuted` / `masterVolume`
globals if it wants to respect the global mute itself. **Nothing else exists from a cabinet's point of
view:** no `Music`, no `art.js`, no `mp*`, no `Physics`, no Firebase. Every shipped cabinet stays
inside that surface.

---

## House look (the arcade default palette)

```js
const XX_BG = '#05070D', XX_GREEN = '#4ADE80', XX_YELLOW = '#FDE68A',
      XX_GREY = '#94A3B8', XX_DIM = '#64748B', XX_RED = '#F87171', XX_FRAME = '#1E3A5F';
const XX_CONFETTI = ['#E63946', '#FFB703', '#52B788', '#9B5DE5', '#00B4D8', '#FDE68A'];
```

Text is `bold Npx monospace`, centred. A cabinet set in a Sylly game's world swaps in that game's
palette and vocabulary instead — Chop Salad uses Fruit Salad's electric lemon `#FFE500` over a
deep-teal gingham tablecloth; Deep-Sea Sweep uses Deep-Sea Deploy's cyan-700 water and seabed sand,
and renames every noun (mines are sea mines, flags are marker buoys, DIG is a sonar PING).

**Australian English in all copy** (colour, flavour, recognise). Metric units only.

---

## Step 3 — Build it from this skeleton

Copy it whole, rename `xx` / `XX_` / `<Name>` / `<id>`, then fill in the game. This is the shape all
shipped cabinets share — the loop, the letterboxing, the pointer discipline and the leaderboard
are already correct here, so deviating from them is nearly always a bug rather than a choice.

```js
// ═══════════════════════════════════════════════════════════════════════════
// <id>.js — ARCADE CABINET 0N. <one-line pitch>. Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no gameplay
// harness (registration is checked by tools/verify-arcade.js; launch + exit by
// tools/smoke-arcade.js — both run when Claude Code integrates it).
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep),
// arcade.js (arcExitCabinet)
//  - Prefix `xx`. Screen id: screen-arcade-<id>. DOM: #xx-stage (pointer
//    target, touch-action:none) wrapping #xx-canvas, plus #btn-xx-exit.
//  - Teardown is wired by the ARC_CABINETS entry's `stop` field, NOT by editing
//    engine.js — resetToLobby() iterates the registry and calls every stop().
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
  showScreen('screen-arcade-<id>');
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

  const visible = () => document.getElementById('screen-arcade-<id>').style.display !== 'none';
  document.addEventListener('keydown', e => { if (!visible()) return; /* desktop bonus keys */ });
  document.getElementById('btn-xx-exit').addEventListener('click', () => { resetArcade<Name>(); arcExitCabinet(); });   // back to the Arcade room
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
  if (document.getElementById('screen-arcade-<id>').style.display !== 'none') xxResize();
});
```

---

## Step 4 — Deliver two things

1. **`<id>.js`** — the clean drop-in cabinet file, nothing else in it.
2. **A standalone single-file HTML preview** — the shell below with the cabinet's code pasted
   **inline** (no `<script src>`, since there is no server offline). Publish it as an artifact so it
   can be opened on a phone and genuinely played.

Then play-test **every state** in the preview before handing it back: start, play, lose, score,
high-score entry, leaderboard, exit, re-enter, tab away and back. Check the console is clean.

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
<div id="screen-arcade-<id>" class="screen" style="display:none">
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
  function arcExitCabinet() { showScreen('screen-lobby'); }   // without this, ✕ throws in the bench
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
// ── <id>.js inlined here (keep in sync with the .js file) ──
</script>
<script>
  document.getElementById('btn-open-xx').addEventListener('click', () => xxStart());
  document.getElementById('btn-mute').addEventListener('click', e => {
    benchMuted = !benchMuted; e.currentTarget.textContent = benchMuted ? 'SOUND: OFF' : 'SOUND: ON';
  });
</script>
</body></html>
```

---

## Step 5 — The hand-off note

End the offline chat with a block that can be pasted straight into a Claude Code session:

```
OFFLINE HAND-OFF — Arcade cabinet <TITLE> (id <id>, prefix xx)

File:      <id>.js  (save to js/arcade/)
Genre:     <the arcade ancestor>
World:     <which Sylly game's world, or "house arcade palette">
Label:     <ROOM LABEL>   (what the Arcade's list shows; usually XX_TITLE)
Blurb:     <one line, ~60 characters, shown under the list — what the player does>
Accent:    <#rrggbb>   (the list row's highlight colour; the world's signature colour)
State:     built / play-tested on a phone / needs X
Entry:     xxStart()            Teardown: resetArcade<Name>()
Screen:    screen-arcade-<id>   DOM: #xx-stage, #xx-canvas, #btn-xx-exit
Decisions: <anything non-obvious chosen deliberately>
Open:      <anything unfinished or unverified>
```

**Put the same block in the cabinet file's header comment** (under the HOW IT PLAYS notes) — the
header is the one durable home for it; the roster does not carry hand-off blocks.

Then **update `arcade-roster.md`** in two places only: add the cabinet's row (status **Built**, with a
provisional number and a `*`) and its one-line summary, and add its prefix to the taken list — that
reservation is what stops two parallel chats picking the same prefix. If the chat can't see the folder,
give the user those two edits to paste in. **Leave the cabinet number as `0N` in the file header** and
do not touch anything outside `js/arcade/`: Claude Code numbers it, registers it and flips the roster
row to Shipped in one command (Step 6).

---

## Step 6 — What happens when it comes back (reference — not an offline task)

Do **not** attempt any of this offline; it needs the repo. It is recorded here so the offline chat
knows what shape the file must be in, and so the hand-off carries the right facts.

**Integration is one command**, run by Claude Code in the repo:

```
node tools/add-cabinet.js <id> --blurb "<the hand-off's Blurb>" --accent "<the hand-off's Accent>"
```

It reads the id, prefix, label, entry and teardown out of the cabinet file, does all seven seams below,
numbers the cabinet, flips the roster row to Shipped, adds the code-map row, rebuilds `index.html` and
runs `verify-build-fresh`, `verify-arcade` and `tools/smoke-arcade.js` (the cabinet launched through
the real room, tapped, dragged, ✕'d and re-entered). A batch of cabinets is one command each and **one**
SW bump (it bumps only if `sw.js` still matches git HEAD). That is why the hand-off block must carry
**Label, Blurb and Accent**, and why the file must follow the skeleton: the tool refuses a cabinet whose
✕ handler, `<prefix>Start()` or `resetArcade*()` it cannot find.

The seams, for reference — every one fails silently if missed, and the tool does them all:

| # | Seam | What breaks if it is missed |
|---|------|-----------------------------|
| 1 | `js/arcade/<id>.js` | — |
| 2 | `ARC_CABINETS` in `js/lobby/arcade.js` — `{ id, label, screen, start, stop, blurb, accent }` | not listed in the Arcade room |
| 3 | `allScreens[]` in `js/engine.js` | **ghost screen** — it never hides, and its canvas paints under every later screen |
| 4 | Markup in `src/screens/arcade.html` | `getElementById` returns null and `start()` throws |
| 5 | `<script src>` in `src/screens/_scripts-3.html` | `start()` is a ReferenceError on launch |
| 6 | `sw.js` `PRECACHE_URLS` + a `CACHE_NAME` bump | the cabinet is missing **offline only** |
| 7 | `node tools/build-index.js` | `index.html` is generated; a hand edit is silently overwritten |

**`ARC_CABINETS` is the registration** (it was `SM_ARCADE` in `secret-mode.js` until SW v254). Its entry carries `stop` beside `start`, both as lazy arrows (a
cabinet's file loads *after* `arcade.js`), because `resetToLobby()` **and** the keyboard-Konami
guard both iterate the registry. That is what keeps "one entry + one file" honest: before SW v249 each
of them named Asherplane directly, which meant six cabinets' RAF loops would have kept updating and
painting underneath every later screen, and the arrow keys would have fed the Konami buffer while
steering the game.

```js
{ id: '<id>', label: '<ROOM LABEL>', screen: 'screen-arcade-<id>',
  start: () => xxStart(), stop: () => resetArcade<Name>(),
  blurb: '<one line>', accent: '<#hex>' },
```

`node tools/verify-arcade.js` checks all seven seams per cabinet plus the global-collision scans,
`node tools/mutate-arcade.js` proves that harness still goes red when a seam is broken, and
`node tools/smoke-arcade.js [id]` is the real-browser launch/exit pass. **Always launch a cabinet
through the room** (`arcLaunch`), never `cab.start()` directly: that skips the router's state and the
lobby repaints underneath it.

One sizing note: the Arcade room's list scrolls inside its own panel (nine rows at SW v255; START stays
reachable down to 320×452). Past a dozen or so the list wants paging rather than more rows.

**When it ships:** in `arcade-roster.md`, set the status to **Shipped (SW vNNN)**, confirm its
cabinet number, and move its hand-off block out of *Built, waiting to go into the real game*.

---

*Canonical rules live in `docs/code-map.md` § Arcade Cabinets and
`js/arcade/_archive/arcade-workshop-notes.md`. If they change there, change them here too — this file
is a copy that travels, and a stale travelling copy is how a cabinet gets built against last month's
contract.*
