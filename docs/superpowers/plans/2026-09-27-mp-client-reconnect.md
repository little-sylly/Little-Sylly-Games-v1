# MDLM Client Reconnect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a client's device drops mid-match, every other device shows a "Waiting for …" pause
instead of hanging forever. A game that adopts the new `reconnect` hook (Honeycomb Hills is the
first) lets the dropped player reload and one-tap rejoin their own seat.

**Architecture:**
- At `GAME_START` the host freezes `rooms/{code}/seats`. Each client keeps one presence child per
  connection under `rooms/{code}/presence/{uid}`, and the host watches that node for the length of
  the match.
- A seat that drops is marked Away:
  - an **adopting game** pauses until the seat is back or the host ends the session;
  - **every other game** ends the session after a 20 s grace.
- A reloaded client finds its room in a new localStorage pointer (`sylly_rejoin`) and sends
  `MP_REJOIN`. The host answers privately with the session context, then the game's own snapshot.

**Tech Stack:** vanilla JS (no modules, all globals), Firebase RTDB modular SDK v10 (through
`window.syllyFirebase`), Node `vm` harnesses, Playwright (`tools/visual-lobby.js`).

**Spec:** `docs/superpowers/specs/2026-09-27-mp-client-reconnect-design.md`. Read it first; this
plan argues from it.

## Refinements to the spec (found while planning, against the real code)

1. **One packet, not two.** `MP_SEAT_AWAY` / `MP_SEAT_BACK` become a single `MP_AWAY_STATE { seats,
   graceEndsAt }`, which always carries the full set. An empty set closes the overlay. Firebase
   erases `seats: []`, so receivers rebuild it with `|| []`.
2. **The rejoiner's clock rides the private snapshot, not the public resume broadcast.** The public
   `COMB_DAYLIGHT` can reach the rejoiner *before* its private `MP_REJOIN_ACCEPT`, and when it does it
   is dropped (per-game routing is off until the accept). So the host calls `resume()` *before*
   `sendState()`, and `combSendFullState()` carries `endTimestamp`.
3. **Away is debounced by 3 s** (`MP_AWAY_DEBOUNCE_MS`). Without it, a sub-second blip cancels an
   open trade. It also absorbs the instant at `GAME_START` before each client's first presence write
   lands, so no separate "seen" gate is needed. A seen-gate would have made a phone that drops right at
   match start never go Away, which brings back the old forever-hang.
4. **The host is skipped by uid, not by index.** A `'teams'` roster reorders `mpPlayerSlots`, so the
   host is not always seat 0.
5. **`lobbyLeaveForGame()` must also stop the Lounge.** At boot on a widescreen the prompt sits over
   the Lounge with its room running, and nothing but router state stops that loop.
6. **Pause cancels an open dance through `combOfferAbandon()`**, not the bare `combClearOffer()`, so
   the table is told. **A turn that *enters* actions while paused banks its Daylight** instead of
   starting a clock.
7. **`visual-lobby.js` checks the prompt and the Lounge stop/resume through `mpApplyRejoinAccept()`
   directly.** Tapping Rejoin there would need the Firebase CDN. The TV-loop half is covered by
   `lobbyLeaveForGame()` being the one shared helper.

## Precondition: the working tree

`git status` shows the v232–v236 lobby work **uncommitted** in files this plan edits:
`js/engine-multiplayer.js`, `js/engine.js`, `js/lobby/lobby-host.js`, `tools/visual-lobby.js` and
`sw.js`. **Before Task 1 the owner commits (or explicitly approves committing) that work as its own
checkpoint.** Otherwise every `git add` below sweeps unrelated changes into a reconnect commit. Do not
start Task 1 on a dirty tree.

## Global Constraints

- No build step, no new dependencies, no ES modules. Every new symbol is a global in the file named.
- `index.html` is **generated**. Edit `src/screens/_mp.html`, then run `node tools/build-index.js` and
  `node tools/verify-build-fresh.js`. Never edit `index.html` by hand, and never use the Edit tool for
  sweeping changes to it.
- Australian English in all copy and comments (colour, organise, recognise).
- New localStorage key: exactly `sylly_rejoin`, value `{ code, game, ts }`. No other new keys.
- Timers: every new handle is cleared in teardown (`mpEndMatchLocal()` → `mpReconnectTeardown()` →
  `resetToLobby()`) — `logic-engine.md` § Timer Lifecycle.
- Firebase erases `null`/`{}`/`[]`: every received collection is rebuilt (`|| []`, `|| null`).
- The host takes a submitter's identity from the envelope's `originId`, never from a payload field.
- The deliberate-quit path (`mpNotifyPlayerLeft()` → `MP_PLAYER_LEFT` → dissolve) and
  `tools/verify-mp-configs.js` §6 are **unchanged**.
- Decision Modal buttons: `min-h-14 w-full rounded-2xl … font-semibold text-lg active:scale-95
  transition-all duration-150`. The inner card uses the verbatim `overlay-modal-inner` string.
- Grace window **20 000 ms**, rejoin key TTL **7 200 000 ms**, rejoin timeout **15 000 ms**, Away
  debounce **3 000 ms**.
- Commit after each task, adding only the files that task names. End every commit message with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

These are the inputs most likely to bite a real table that no task's happy path exercises. Each one
has a test in the task named.

1. **The host is not seat 0** (a `'teams'` roster reorders the slots). The host must never mark itself
   Away. → Task 3, check 3.7.
2. **The presence node vanishes entirely when its last child goes.** `snap.exists()` is false, and
   every seen seat must go Away without a throw. → Task 3, check 3.6.
3. **A corrupt, stale or unreadable `sylly_rejoin`** (bad JSON, a 3-hour-old `ts`, a game that no
   longer adopts, localStorage throwing). Boot must never throw, and a bad key is cleared. → Task 7,
   checks 6.3–6.6.
4. **A public SYNC reaches the rejoiner before its private ACCEPT.** It must be ignored silently, and
   the live Daylight deadline must still arrive, in the snapshot. → Task 5, check 5.9; Task 6, check
   26b.
5. **The host never answers a rejoin** (it left, or the room is half torn down). The prompt must fail
   cleanly at 15 s rather than spin forever. → Task 5, check 5.8.

---

## File map

| File | Responsibility | Tasks |
|------|----------------|-------|
| `tools/verify-mp-reconnect.js` (new) | Loads the real `js/engine-multiplayer.js` on N devices over a fake Firebase with sockets. The only place seats/presence/rejoin execute | 1, 3–5, 7 |
| `js/engine-multiplayer.js` | `mpApplySettings` extraction; everything reconnect (state, presence, Away, grace, rejoin, prompt); the `comb` hook entry | 2–7 |
| `js/engine.js` | One line in `resetToLobby()`: `mpReconnectTeardown()` | 4 |
| `src/screens/_mp.html` | `#mp-away-overlay`, `#mp-rejoin-overlay`, ids on the host-disconnected copy | 3, 4, 5 |
| `js/games/comb.js` | `combReconnectPause/Resume`, `COMB_DAYLIGHT`, paused-Daylight banking, clock in the full state | 6 |
| `tools/verify-comb-loopback.js` | § 26b/26c: pause → rebuilt device → resume | 6 |
| `tools/verify-mp-configs.js` | § 7: the hook is whole where present; adopters = `['comb']` | 6 |
| `js/lobby/lobby-host.js` | `lobbyLeaveForGame()`, shared with `lobbyLaunch()` | 7 |
| `tools/visual-lobby.js` | § 16: the boot prompt over the real lobby. Needs `comb` adopted, which is why it comes after Task 6 | 7 |
| `tools/mutate-mp-reconnect.js` (new) | Reverts load-bearing lines; the harness must go red for each | 8 |
| `sw.js`, `CLAUDE.md`, rule files, docs | Version + Documentation Integrity Protocol | 9 |

---

### Task 1: The reconnect harness — a fake Firebase with sockets, today's lobby flow green

**Files:**
- Create: `tools/verify-mp-reconnect.js`

**Interfaces:**
- Produces (used by every later task's checks, all inside this file):
  - `server`, `connect(name)` → `{ fb, conn, drop({late}), heal(), kill({late}) }`
  - `boot(name, uid, phone)` → `dev`, with `dev.S` (sandbox), `dev.net`, `dev.el(id)`, `dev.screens`,
    `dev.inbox`, `dev.errors`
  - `advance(ms)`, `flush()`, `check()`, `ok()`, `section()`
  - `startMatch(game, names)` → `{ host, clients }`: a created room, clients joined, `GAME_START` applied
  - two injected games: `'rcgame'` (adopts reconnect; hooks record into `dev.S.__rc`) and `'plain'`
    (does not)

- [ ] **Step 1: Write the harness file**

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-mp-reconnect.js — MDLM client reconnect, driven through the REAL
// js/engine-multiplayer.js on several devices, over a fake Firebase that has
// SOCKETS: each device can drop, heal, or be killed (a reload), and the server
// runs its onDisconnect ops on time or LATE (the stale-socket race).
//
//   node tools/verify-mp-reconnect.js        (exits 1 on any failure)
//   MP_SRC=path node tools/…                 (drive a deliberately-broken copy)
//
// Spec: docs/superpowers/specs/2026-09-27-mp-client-reconnect-design.md
//
// Every other harness stubs the engine's room layer (the game loopbacks replace
// mpSendEnvelope outright). This is the only place mpHostCreateRoom,
// mpClientJoinRoom, mpConfirmRoster, seats, presence and rejoin actually run.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT  = path.join(__dirname, '..');
const MP    = process.env.MP_SRC ? path.resolve(process.env.MP_SRC) : path.join(ROOT, 'js/engine-multiplayer.js');
const mpSrc = fs.readFileSync(MP, 'utf8');

// ── The wire (verbatim from verify-comb-loopback.js) ────────────────────────
function fbWrite(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'object') return v;
  const out = {};
  const keys = Array.isArray(v) ? v.map((_, i) => String(i)) : Object.keys(v);
  keys.forEach(k => {
    const w = fbWrite(Array.isArray(v) ? v[Number(k)] : v[k]);
    if (w !== undefined) out[k] = w;
  });
  return Object.keys(out).length ? out : undefined;
}
function fbRead(v) {
  if (v === undefined || v === null || typeof v !== 'object') return v;
  const keys = Object.keys(v);
  const numeric = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
  if (numeric) {
    const max = Math.max(...keys.map(Number));
    if (keys.length * 2 > max + 1) {
      const arr = [];
      for (let i = 0; i <= max; i++) arr[i] = Object.prototype.hasOwnProperty.call(v, String(i)) ? fbRead(v[String(i)]) : null;
      return arr;
    }
  }
  const out = {};
  keys.forEach(k => { out[k] = fbRead(v[k]); });
  return out;
}

// ── Clock + microtask flush ──────────────────────────────────────────────────
const clock = { now: 1700000000000 };
const flush = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };

// ── The server: one tree, every subscription, delivery on change ────────────
function snap(v, key, p) {
  return {
    key, ref: p ? { path: p, key } : undefined,
    exists: () => v !== undefined && v !== null,
    val: () => (v === undefined ? null : v),
    forEach(fn) { if (v && typeof v === 'object') Object.keys(v).forEach(k => fn(snap(v[k], k, p ? p + '/' + k : k))); },
  };
}
const server = {
  tree: {}, subs: [], seq: 0, busy: false, dirty: false,
  parts: p => String(p).split('/').filter(Boolean),
  read(p) {
    let n = this.tree;
    for (const k of this.parts(p)) { if (n == null || typeof n !== 'object') return undefined; n = n[k]; }
    return n;
  },
  put(p, stored) {
    const ks = this.parts(p), trail = [];
    let n = this.tree;
    for (const k of ks.slice(0, -1)) {
      if (n[k] == null || typeof n[k] !== 'object') { if (stored === undefined) return this.notify(); n[k] = {}; }
      trail.push([n, k]); n = n[k];
    }
    const last = ks[ks.length - 1];
    if (stored === undefined) delete n[last]; else n[last] = stored;
    for (let i = trail.length - 1; i >= 0; i--) {            // Firebase keeps no empty node
      const [par, k] = trail[i];
      if (Object.keys(par[k]).length === 0) delete par[k]; else break;
    }
    this.notify();
  },
  key() { return '-k' + String(++this.seq).padStart(6, '0'); },
  notify() {
    if (this.busy) { this.dirty = true; return; }
    this.busy = true;
    try {
      do {
        this.dirty = false;
        for (const s of this.subs.slice()) {
          if (s.dead || !s.conn.online) continue;
          const raw = this.read(s.path);
          if (s.kind === 'value') {
            const j = JSON.stringify(raw === undefined ? null : raw);
            if (j === s.last) continue;
            s.last = j; s.cb(snap(fbRead(raw), undefined, s.path));
          } else {
            const kids = raw && typeof raw === 'object' ? Object.keys(raw).sort() : [];
            for (const k of kids) {
              if (s.seen.has(k)) continue;
              s.seen.add(k); s.cb(snap(fbRead(raw[k]), k, s.path + '/' + k));
            }
          }
        }
      } while (this.dirty);
    } finally { this.busy = false; }
  },
};

// ── One socket. A reload is kill() + a new connect() for the same uid. ───────
function connect(name) {
  const conn = { name, online: true, killed: false, onDis: [], info: [], queue: [], errors: [] };
  const call = (cb, s) => { try { cb(s); } catch (e) { conn.errors.push(name + ': ' + (e && e.stack || e)); } };
  const write = (p, v) => {
    if (conn.killed) return;
    if (!conn.online) { conn.queue.push([p, v]); return; }
    server.put(p, fbWrite(v));
  };
  const sub = (kind, p, cb) => {
    const s = { conn, kind, path: p, cb: x => call(cb, x), seen: new Set(), last: undefined, dead: false };
    server.subs.push(s); server.notify();
    return () => { s.dead = true; };
  };
  const fb = {
    ref: p => ({ path: p, key: String(p).split('/').pop() }),
    set: (r, v) => { write(r.path, v); return Promise.resolve(); },
    remove: r => { if (r && r.path) write(r.path, undefined); return Promise.resolve(); },
    push: (r, v) => {
      const key = server.key(), child = { path: r.path + '/' + key, key };
      if (v !== undefined) write(child.path, v);
      return Object.assign({}, child, { then: res => res(child) });
    },
    get: r => Promise.resolve(snap(fbRead(server.read(r.path)), r.key, r.path)),
    onValue: (r, cb) => {
      if (r.path === '.info/connected') {
        const h = { cb, dead: false }; conn.info.push(h); call(cb, snap(conn.online));
        return () => { h.dead = true; };
      }
      return sub('value', r.path, cb);
    },
    onChildAdded: (r, cb) => sub('child', r.path, cb),
    onDisconnect: r => ({
      remove: () => { conn.onDis.push(r.path); return Promise.resolve(); },
    }),
  };
  const infoFire = () => conn.info.forEach(h => { if (!h.dead) call(h.cb, snap(conn.online)); });
  // A socket's onDisconnect ops belong to THAT socket: snapshot them at the drop.
  // `late` = the server has not noticed yet; the returned function is its notice.
  const takeOnDis = () => { const ops = conn.onDis.splice(0); return () => ops.forEach(p => server.put(p, undefined)); };
  return {
    fb, conn,
    drop({ late = false } = {}) { conn.online = false; infoFire(); const fire = takeOnDis(); if (!late) fire(); return fire; },
    heal() {
      conn.online = true;
      conn.queue.splice(0).forEach(([p, v]) => server.put(p, fbWrite(v)));
      server.notify(); infoFire();
    },
    kill({ late = false } = {}) {
      conn.online = false; conn.killed = true;
      server.subs.forEach(s => { if (s.conn === conn) s.dead = true; });
      conn.info = [];
      const fire = takeOnDis(); if (!late) fire(); return fire;
    },
  };
}

// ── A mock DOM of REAL elements (a null getElementById hides every render) ───
function makeDocument() {
  const byId = {};
  const mk = (id, tag) => {
    const el = {
      id, tagName: tag || 'div', style: {}, dataset: {}, value: '', textContent: '', disabled: false,
      children: [], _l: {}, _cls: new Set(), _html: '',
      get className() { return [...this._cls].join(' '); },
      set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = String(v); this.children = []; },
      classList: {
        add: (...c) => c.forEach(x => el._cls.add(x)),
        remove: (...c) => c.forEach(x => el._cls.delete(x)),
        contains: c => el._cls.has(c),
        toggle: (c, on) => { if (on === undefined) on = !el._cls.has(c); on ? el._cls.add(c) : el._cls.delete(c); },
      },
      addEventListener(t, fn) { (this._l[t] = this._l[t] || []).push(fn); },
      removeEventListener() {},
      click() { (this._l.click || []).forEach(fn => fn({ target: el, preventDefault() {}, stopPropagation() {} })); },
      focus() {}, blur() {},
      appendChild(c) { this.children.push(c); return c; },
      removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
      querySelector: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 360, height: 640 }),
    };
    return el;
  };
  const doc = {
    body: mk('body'), head: mk('head'), _l: {},
    addEventListener(t, fn) { (this._l[t] = this._l[t] || []).push(fn); },
    removeEventListener() {},
    dispatchEvent() {},
    createElement: tag => mk(null, tag),
    querySelector: () => null, querySelectorAll: () => [],
    getElementById(id) { if (!byId[id]) byId[id] = mk(id); return byId[id]; },
  };
  return doc;
}

// ── A phone: localStorage survives a reload; memory does not ────────────────
function makePhone() {
  const store = {}; let throwing = false;
  return {
    store, setThrowing(v) { throwing = v; },
    storage: {
      getItem: k => { if (throwing) throw new Error('storage blocked'); return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: (k, v) => { if (throwing) throw new Error('storage blocked'); store[k] = String(v); },
      removeItem: k => { if (throwing) throw new Error('storage blocked'); delete store[k]; },
    },
  };
}

// ── One device = one vm running the real engine ─────────────────────────────
const devices = [];
function boot(name, uid, phone) {
  const net = connect(name);
  const timers = [], screens = [], errors = [], inbox = [];
  let seq = 0;
  const S = {
    console: { log: () => {}, warn: (...a) => errors.push('warn: ' + a.map(String).join(' ')),
               error: (...a) => errors.push('error: ' + a.map(String).join(' ')) },
    document: makeDocument(),
    window: {},
    navigator: { onLine: true },
    localStorage: phone.storage,
    Date: { now: () => clock.now },
    setTimeout:  (fn, ms) => { timers.push({ fn, at: clock.now + (ms || 0), id: ++seq, repeat: false }); return seq; },
    setInterval: (fn, ms) => { timers.push({ fn, at: clock.now + (ms || 0), id: ++seq, repeat: true, ms: ms || 1000 }); return seq; },
    clearTimeout:  id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    clearInterval: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    showScreen: id => screens.push(id),
    SYLLY_VERSION: 'vTEST',
    __rc: [], __resets: 0, __left: 0, __leftForGame: 0,
  };
  ['playLaunch', 'playExit', 'playDone', 'playSuccess', 'playBoing', 'playWhoosh', 'playPillClick', 'playTick']
    .forEach(n => { S[n] = () => {}; });
  S.lobbyLeaveForGame = () => { S.__leftForGame++; };
  // Mirrors the multiplayer half of engine.js resetToLobby() — lines 881-897 — plus
  // the one call this plan adds there. Task 4 asserts engine.js really makes it.
  S.resetToLobby = () => {
    S.__resets++;
    const w = S.window;
    if (w.syllyFirebase && w.syllyMultiplayerMode === 'host') {
      try { S.mpSendEnvelope({ type: 'LOBBY', payload: { action: 'HOST_END_GAME' } }); } catch (_) {}
      S.syllyTeardownRoom();
    }
    if (w.syllyFirebase && w.syllyMultiplayerMode === 'client' && w.mpClientPlayerRef) {
      try { w.syllyFirebase.remove(w.mpClientPlayerRef); } catch (_) {}
      w.mpClientPlayerRef = null;
    }
    w.syllyMultiplayerMode = 'single';
    w.syllySyncLocked = false;
    if (typeof S.mpReconnectTeardown === 'function') S.mpReconnectTeardown();
  };
  S.globalThis = S;
  vm.createContext(S);
  vm.runInContext('let activeGameId = null;', S);
  vm.runInContext(mpSrc, S, { filename: 'engine-multiplayer.js (' + name + ')' });
  // Firebase is "lazy-loaded" the moment the device needs it — here, at once.
  S.window.syllyFirebase  = net.fb;
  S.window.syllyDeviceUid = uid;
  // Two test games. 'rcgame' adopts reconnect; 'plain' does not.
  vm.runInContext(`
    const __base = {
      emoji: '🧪', brandBtnClass: 'bg-test', ptpLabel: 'Go', lobbyCtaLabel: 'Go',
      menuScreen: 'screen-test-menu', recommendedMode: 'mdlm', supportedModes: ['mdlm'],
      multiplayerOnly: true, rosterConfig: { type: 'none' },
      getMaxPlayers: () => 4, getMinPlayers: () => 2,
      onPassThePhone: () => { __rc.push('onPassThePhone:' + window.syllyMultiplayerMode); showScreen('screen-test-live'); },
    };
    MP_GAME_CONFIGS.rcgame = Object.assign({}, __base, { gameName: 'Test Game',
      reconnect: {
        sendState: i => { __rc.push('sendState:' + i);
          mpSendPrivate(mpSeats[i], { type: 'SYNC', payload: { action: 'TEST_STATE', seat: i } }); },
        pause:  () => __rc.push('pause'),
        resume: () => __rc.push('resume'),
      } });
    MP_GAME_CONFIGS.plain = Object.assign({}, __base, { gameName: 'Plain Game' });
  `, S);
  // Record every envelope this device routes, then route it for real.
  vm.runInContext(`
    const __route = mpHandleEnvelope;
    mpHandleEnvelope = env => { __inbox.push(env); return __route(env); };
  `, Object.assign(S, { __inbox: inbox }));
  const dev = {
    name, uid, phone, net, S, timers, screens, errors, inbox,
    el: id => S.document.getElementById(id),
    run: code => vm.runInContext(code, S),
    shown: id => S.document.getElementById(id).style.display === 'flex',
  };
  devices.push(dev);
  return dev;
}

// Fire every timer on every live device whose time has come, in time order.
function advance(ms) {
  const until = clock.now + ms;
  for (;;) {
    let next = null;
    devices.forEach(d => { if (d.net.conn.killed) return; d.timers.forEach(t => { if (!next || t.at < next.t.at) next = { d, t }; }); });
    if (!next || next.t.at > until) break;
    clock.now = next.t.at;
    const { d, t } = next;
    if (t.repeat) t.at = clock.now + t.ms; else d.timers.splice(d.timers.indexOf(t), 1);
    try { t.fn(); } catch (e) { d.errors.push('timer: ' + (e && e.stack || e)); }
  }
  clock.now = until;
}

// ── Assertions — the suite's summary shape, verbatim ────────────────────────
let failures = 0, total = 0;
function check(label, actual, expected) {
  total++;
  const good = JSON.stringify(actual) === JSON.stringify(expected);
  if (!good) failures++;
  console.log((good ? '  ok    ' : '  FAIL  ') + label +
    (good ? '' : '\n          expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)));
}
function ok(label, cond, detail) {
  total++;
  if (cond) console.log('  ok    ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? '\n          ' + detail : '')); }
}
const section = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 68 - t.length)));
const errorsOf = list => list.flatMap(d => [...d.errors, ...d.net.conn.errors]);

// ── Drive the real lobby: create, join, confirm ─────────────────────────────
async function startMatch(game, names) {
  server.tree = {}; server.subs = []; devices.length = 0;
  const host = boot('host', 'uH', makePhone());
  host.S.localStorage.setItem('sylly_nickname', names[0]);
  host.run(`mpActiveGame = '${game}'; mpActiveGameConfig = MP_GAME_CONFIGS['${game}'];`);
  host.run('mpHostCreateRoom()');
  await flush();
  const code = host.run('mpActiveRoomCode');
  const clients = [];
  for (let i = 1; i < names.length; i++) {
    const c = boot('c' + i, 'u' + i, makePhone());
    c.run(`mpActiveGame = '${game}'; mpActiveGameConfig = MP_GAME_CONFIGS['${game}'];`);
    code.split('').forEach((ch, j) => { c.el('mp-join-c' + (j + 1)).value = ch; });
    c.el('mp-join-nickname-input').value = names[i];
    c.run('mpClientJoinRoom()');
    await flush();
    clients.push(c);
  }
  host.run('mpConfirmRoster()');
  await flush();
  return { host, clients, code };
}

(async () => {
  console.log('Client reconnect — the real engine on N devices, over sockets');
  console.log('='.repeat(72));
  try {
    section('1. The wire and the sockets themselves');
    check('empty array is erased',        fbRead(fbWrite({ a: [], keep: 1 })), { keep: 1 });
    check('0 and false survive',          fbRead(fbWrite({ a: 0, b: false })), { a: 0, b: false });
    {
      server.tree = {}; server.subs = [];
      const a = connect('a'), b = connect('b');
      let seen = null;
      b.fb.onValue(b.fb.ref('x'), s => { seen = s.val(); });
      a.fb.set(a.fb.ref('x/y'), 1);
      check('a value listener hears another socket', seen, { y: 1 });
      const mine = a.fb.push(a.fb.ref('p/u'));
      a.fb.onDisconnect(mine).remove(); a.fb.set(mine, true);
      a.drop();
      check('a drop runs that socket\'s onDisconnect', server.read('p'), undefined);
      a.heal();
      const again = a.fb.push(a.fb.ref('p/u'));
      a.fb.onDisconnect(again).remove(); a.fb.set(again, true);
      const late = a.drop({ late: true });
      ok('a LATE drop leaves the node until the server notices', !!server.read('p/u'));
      late();
      check('  …then removes only that socket\'s child', server.read('p'), undefined);
    }

    section('2. Today\'s lobby flow runs in the vm, end to end');
    {
      const { host, clients } = await startMatch('plain', ['Ali', 'Bec', 'Cam']);
      check('three slots on the host', host.run('mpPlayerSlots.map(p => p.nickname)'), ['Ali', 'Bec', 'Cam']);
      check('every client took GAME_START', clients.map(c => c.run('mpMyPlayerIdx')), [1, 2]);
      check('every device ran onPassThePhone', [host, ...clients].map(d => d.S.__rc.filter(x => x.startsWith('onPassThePhone')).length), [1, 1, 1]);
      check('no errors anywhere', errorsOf([host, ...clients]), []);
    }

    // ── Later tasks add sections 3+ here, above this line ──

  } catch (e) {
    failures++; total++;
    console.log('\n  FAIL  the run could not finish');
    console.log('          ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n          '));
  }
  console.log('\n' + '='.repeat(72));
  console.log(failures ? `${failures} of ${total} CHECKS FAILED` : `ALL ${total} CHECKS PASSED`);
  process.exit(failures ? 1 : 0);
})();
```

- [ ] **Step 2: Run it**

Run: `node tools/verify-mp-reconnect.js`
Expected: `ALL 10 CHECKS PASSED`. Section 2 proves the real `mpHostCreateRoom` → `mpClientJoinRoom` →
`mpConfirmRoster` path executes against the fake. **If section 2 throws on a missing mock API**, the
stack names it; add exactly that method to `mk()` in `makeDocument()` (the engine's DOM calls are
`getElementById`, `.value`, `.textContent`, `.style`, `.disabled`, `.classList.add/remove/toggle`,
`createElement`, `innerHTML`, `appendChild` — all present). Do not stub engine functions to make it
pass.

- [ ] **Step 3: Commit**

```bash
git add tools/verify-mp-reconnect.js
git commit -m "test(mp): reconnect harness — the real engine over a socketed fake Firebase" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Extract `mpApplySettings(abbr, s)` (pure move, no behaviour change)

**Files:**
- Modify: `js/engine-multiplayer.js`, the `SETTINGS_SYNC` block (today ~lines 1074–1247)
- Test: `tools/verify-mp-reconnect.js`

**Interfaces:**
- Produces: `function mpApplySettings(abbr, s)`, where `s` is the object `mpSerialiseSettings(abbr)`
  returns. It applies it to the game's globals and returns nothing. Task 5 calls it.

- [ ] **Step 1: Write the failing check.** Add above the `// ── Later tasks add sections` line:

```js
    section('3. mpApplySettings is the one settings applier');
    {
      const d = boot('solo', 'uS', makePhone());
      ok('mpApplySettings exists', d.run('typeof mpApplySettings') === 'function');
      d.run(`var gmFrequencyRange = 'stable'; mpApplySettings('gm', { gmFrequencyRange: 'chaotic' });`);
      check('it applies a game\'s settings', d.run('gmFrequencyRange'), 'chaotic');
      ok('SETTINGS_SYNC routes through it',
         /action === 'SETTINGS_SYNC'\)\s*\{?\s*mpApplySettings\(mpActiveGame/.test(mpSrc));
    }
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tools/verify-mp-reconnect.js`
Expected: FAIL on `mpApplySettings exists` (and the two after it).

- [ ] **Step 3: Do the extraction with a script.** The block is ~170 lines; a script moves it
  byte-for-byte. Save as `<scratchpad>/extract-settings.js` and run it with `node`:

```js
const fs = require('fs');
const F = 'D:/Coding Projects/Little-Sylly-Games/js/engine-multiplayer.js';
let src = fs.readFileSync(F, 'utf8');
const head = "    if (env.payload.action === 'SETTINGS_SYNC') {\n      const s = env.payload.gameSettings || {};\n      switch (mpActiveGame) {";
const at = src.indexOf(head);
if (at < 0) throw new Error('SETTINGS_SYNC head not found');
const swStart = src.indexOf('switch (mpActiveGame) {', at);
let depth = 0, i = src.indexOf('{', swStart);
for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (depth === 0) break; } }
const swEnd = i + 1;                                   // just past the switch's closing brace
const body = src.slice(swStart, swEnd).replace('switch (mpActiveGame) {', 'switch (abbr) {');
const ifClose = src.indexOf('}', swEnd);               // the `if (SETTINGS_SYNC)` block's own brace
src = src.slice(0, at)
  + "    if (env.payload.action === 'SETTINGS_SYNC') {\n      mpApplySettings(mpActiveGame, env.payload.gameSettings || {});\n    }"
  + src.slice(ifClose + 1);
const fnAnchor = '// ── Envelope: receive + route ─────────────────────────────────────────────────';
const fnAt = src.indexOf(fnAnchor);
if (fnAt < 0) throw new Error('receive-route anchor not found');
const fn = '// ── Settings applier (SETTINGS_SYNC + the reconnect ACCEPT share it) ──────────\n'
  + '// Moved verbatim out of SETTINGS_SYNC so a rejoining client applies the room\'s\n'
  + '// settings through exactly the same code as a device that was there all along.\n'
  + 'function mpApplySettings(abbr, s) {\n  ' + body.replace(/\n      /g, '\n  ') + '\n}\n\n';
src = src.slice(0, fnAt) + fn + src.slice(fnAt);
fs.writeFileSync(F, src);
console.log('moved', body.split('\n').length, 'lines');
```

- [ ] **Step 4: Read the result.** Grep `function mpApplySettings` and read that function whole. Check
  that the `switch (abbr)` is well-formed, and that `SETTINGS_SYNC` is now the three-line call. Then
  confirm nothing else changed:
  `git diff --stat js/engine-multiplayer.js` should show about the same count of lines added and removed.

- [ ] **Step 5: Run everything that touches SETTINGS_SYNC**

Run: `node tools/verify-mp-reconnect.js && node tools/verify-jec-loopback.js && node tools/verify-mp-configs.js`
Expected: all three print their all-passed line.

- [ ] **Step 6: Commit**

```bash
git add js/engine-multiplayer.js tools/verify-mp-reconnect.js
git commit -m "refactor(mp): mpApplySettings — one settings applier for SETTINGS_SYNC and rejoin" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Seats, presence, and the Away overlay

**Files:**
- Modify: `js/engine-multiplayer.js`:
  - reconnect state after line 32 (`let mpMyPlayerIdx`);
  - a new section before `// ── Settings applier`;
  - `mpStopListeners`;
  - `mpConfirmRoster`;
  - the client `GAME_START` applier;
  - the `LOBBY` branch of `mpHandleEnvelope`;
  - the `DOMContentLoaded` block.
- Modify: `src/screens/_mp.html` — add `#mp-away-overlay` after `#mp-host-disconnected-overlay`
- Test: `tools/verify-mp-reconnect.js`

**Interfaces:**
- Produces:
  - state: `mpSeats` (uid[]), `mpMatchLive` (bool), `mpAwaySeats` (Set of seat indices),
    `mpAwayPending` (Map<int, handle>), `mpPresenceListener`, `mpConnListener`, `mpPresenceRef`,
    `mpAwayTimer`, `mpAwayTick`, `mpAwayGraceEndsAt`, `mpRejoinTimer`;
  - constants: `MP_AWAY_DEBOUNCE_MS`, `MP_AWAY_GRACE_MS`, `MP_REJOIN_TIMEOUT_MS`, `MP_REJOIN_KEY`,
    `MP_REJOIN_TTL_MS`;
  - functions: `mpSeatList(v)` → uid[]; `async mpBeginMatchSeats()`; `mpStartPresence()`;
    `mpRemovePresence()`; `mpStartPresenceWatcher()`; `mpCancelAwayPending(idx)`;
    `mpClearAwayPending()`; `mpMarkAway(idx)`; `mpMarkBack(idx)`; `mpBroadcastAway()`;
    `mpAwayNames(seats)` → string; `mpShowAwayOverlay(seats, graceEndsAt)`; `mpWireReconnect()`;
  - packet: `LOBBY MP_AWAY_STATE { seats: int[], graceEndsAt: number }`.
- `mpArmAwayGrace()` is **called** here but defined in Task 4. Until then, add a one-line stub so
  this task stands alone: `function mpArmAwayGrace() {}`. Task 4 replaces it.

- [ ] **Step 1: Write the failing checks** (above `// ── Later tasks add sections`):

```js
    section('4. Seats freeze at GAME_START; presence is per connection');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec', 'Cam']);
      const [c1, c2] = clients;
      check('seats written once, in seat order', server.read(`rooms/${host.run('mpActiveRoomCode')}/seats`), { 0: 'uH', 1: 'u1', 2: 'u2' });
      check('every device knows the seats', [host, c1, c2].map(d => d.run('mpSeats')), [['uH', 'u1', 'u2'], ['uH', 'u1', 'u2'], ['uH', 'u1', 'u2']]);
      const pres = server.read(`rooms/${host.run('mpActiveRoomCode')}/presence`) || {};
      check('each client wrote one presence child', [Object.keys(pres.u1 || {}).length, Object.keys(pres.u2 || {}).length], [1, 1]);
      ok('the host writes no presence', !pres.uH);

      section('5. A blip shorter than the debounce never pauses the table');
      c1.net.drop();
      advance(1000);
      c1.net.heal();
      await flush();
      advance(5000);
      check('nobody was ever marked Away', host.run('[...mpAwaySeats]'), []);
      check('the adopter was never paused', host.S.__rc.filter(x => x === 'pause'), []);
      ok('no overlay on any device', ![host, c1, c2].some(d => d.shown('mp-away-overlay')));

      section('6. A real drop: Away after the debounce, on every device, paused once');
      c1.net.kill();
      advance(2999);
      check('not yet — inside the debounce', host.run('[...mpAwaySeats]'), []);
      advance(1);
      await flush();
      check('seat 1 is Away', host.run('[...mpAwaySeats]'), [1]);
      check('pause() ran exactly once', host.S.__rc.filter(x => x === 'pause').length, 1);
      ok('the host shows the overlay', host.shown('mp-away-overlay'));
      ok('the other client shows it too', c2.shown('mp-away-overlay'));
      check('  …naming who', c2.el('mp-away-heading').textContent, 'Waiting for Bec…');
      check('the host gets End session, not Leave',
            [host.el('btn-mp-away-end').style.display, host.el('btn-mp-away-leave').style.display], ['', 'none']);
      check('a client gets Leave, not End session',
            [c2.el('btn-mp-away-end').style.display, c2.el('btn-mp-away-leave').style.display], ['none', '']);

      section('7. Two away at once — one pause, one sentence, one resume');
      c2.net.drop();
      advance(3000); await flush();
      check('both seats are Away', host.run('[...mpAwaySeats].sort()'), [1, 2]);
      check('still only one pause()', host.S.__rc.filter(x => x === 'pause').length, 1);
      check('the overlay names both', host.el('mp-away-heading').textContent, 'Waiting for Bec and Cam…');
      c2.net.heal(); await flush();
      check('one back, one still away: no resume yet', host.S.__rc.filter(x => x === 'resume').length, 0);
      check('  …and the overlay names who is left', host.el('mp-away-heading').textContent, 'Waiting for Bec…');
      check('no errors anywhere', errorsOf([host, c1, c2]), []);
    }

    section('8. The stale-socket race: a late onDisconnect never evicts a live seat');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec']);
      const [c1] = clients;
      const oldSocketNotice = c1.net.drop({ late: true });   // server has not noticed yet
      c1.net.heal();                                         // the device is back on a new socket
      await flush();
      oldSocketNotice();                                      // …and NOW the old socket times out
      advance(5000); await flush();
      check('seat 1 was never marked Away', host.run('[...mpAwaySeats]'), []);
      const pres = server.read(`rooms/${host.run('mpActiveRoomCode')}/presence/u1`) || {};
      check('the new connection\'s child survived', Object.keys(pres).length, 1);
    }

    section('9. An erased presence node and a host that is NOT seat 0');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec', 'Cam']);
      // A 'teams' roster reorders slots — put the host in seat 1.
      host.run(`mpSeats = ['u1', 'uH', 'u2']; mpPlayerSlots = [mpPlayerSlots[1], mpPlayerSlots[0], mpPlayerSlots[2]];`);
      clients.forEach(c => c.net.kill());
      advance(3000); await flush();
      check('check 3.6 — the whole presence node is gone', server.read(`rooms/${host.run('mpActiveRoomCode')}/presence`), undefined);
      check('both client seats went Away (by index)', host.run('[...mpAwaySeats].sort()'), [0, 2]);
      ok('check 3.7 — the host never marked itself Away', !host.run('mpAwaySeats.has(1)'));
      check('no errors', errorsOf([host]), []);
    }
```

- [ ] **Step 2: Run and watch them fail**

Run: `node tools/verify-mp-reconnect.js`
Expected: section 4 FAILs first (`seats written once` gets `undefined`).

- [ ] **Step 3: Add the state** (after `let mpMyPlayerIdx = -1; …` at line 32):

```js

// ── Reconnect State (SW v236 — docs/superpowers/specs/2026-09-27-mp-client-reconnect-design.md) ──
let mpSeats            = [];        // uids in seat order, frozen at GAME_START — mirrors rooms/{code}/seats
let mpMatchLive        = false;     // true from GAME_START until LOBBY_RESET / teardown
let mpAwaySeats        = new Set(); // host: seat indices currently Away
let mpAwayPending      = new Map(); // host: seat index → setTimeout handle (the Away debounce)
let mpPresenceListener = null;      // host: onValue unsubscribe for rooms/{code}/presence
let mpConnListener     = null;      // client: onValue unsubscribe for .info/connected
let mpPresenceRef      = null;      // client: this connection's own presence child
let mpAwayTimer        = null;      // host: setTimeout handle — a non-adopter's grace
let mpAwayTick         = null;      // any: setInterval handle — the overlay's countdown text
let mpAwayGraceEndsAt  = 0;         // host: when a non-adopter's grace runs out
let mpRejoinTimer      = null;      // client: setTimeout handle — a rejoin nobody answered
const MP_AWAY_DEBOUNCE_MS  = 3000;    // a blip shorter than this never pauses the table
const MP_AWAY_GRACE_MS     = 20000;   // games without reconnect: how long the table waits
const MP_REJOIN_TIMEOUT_MS = 15000;   // a rejoin the host never answers
const MP_REJOIN_KEY        = 'sylly_rejoin';
const MP_REJOIN_TTL_MS     = 7200000; // 2 h — mpCleanupStaleRooms()'s own age limit
```

- [ ] **Step 4: Add the reconnect section** (immediately before `// ── Settings applier (SETTINGS_SYNC + …`):

```js
// ═══════════════════════════════════════════════════════════════
// CLIENT RECONNECT (SW v236)
// A DROP is not a QUIT. A deliberate quit still dissolves the session (the Mid-Game
// Quit Contract, below — unchanged). A drop used to do nothing at all: the client's
// onDisconnect deleted its /players entry, the host had stopped watching /players at
// mpConfirmRoster(), and every other device waited on a turn that never came.
// Now rooms/{code}/seats freezes who owns which seat at GAME_START, each client keeps
// ONE presence child PER CONNECTION under rooms/{code}/presence/{uid}, and the host
// watches presence for the length of the match.
// Spec: docs/superpowers/specs/2026-09-27-mp-client-reconnect-design.md
// ═══════════════════════════════════════════════════════════════

// Firebase hands back a dense array as an array and a sparse one as an object.
function mpSeatList(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  return v && typeof v === 'object' ? Object.values(v).filter(Boolean) : [];
}

// Host, from mpConfirmRoster(): freeze the seats and start watching presence.
async function mpBeginMatchSeats() {
  mpSeats = mpPlayerSlots.map(p => p.uid);
  mpMatchLive = true;
  mpAwaySeats.clear(); mpClearAwayPending();
  const fb = window.syllyFirebase;
  if (!fb || !mpActiveRoomCode) return;
  try { await fb.set(fb.ref(`rooms/${mpActiveRoomCode}/seats`), mpSeats); } catch (_) {}
  mpStartPresenceWatcher();
}

// Client: one presence child per CONNECTION. A single presence/{uid} = true would be
// wiped by a stale socket's LATE onDisconnect after a fast reload — so each socket
// removes only its own child, and a seat counts as present while ANY child exists.
// Re-written on every .info/connected === true, which is what heals a blip.
function mpStartPresence() {
  const fb = window.syllyFirebase;
  if (!fb || !mpActiveRoomCode || !window.syllyDeviceUid) return;
  if (mpConnListener) { mpConnListener(); mpConnListener = null; }
  const code = mpActiveRoomCode, uid = window.syllyDeviceUid;
  mpConnListener = fb.onValue(fb.ref('.info/connected'), snap => {
    if (snap.val() !== true || mpActiveRoomCode !== code) return;
    const mine = fb.push(fb.ref(`rooms/${code}/presence/${uid}`));
    fb.onDisconnect(mine).remove();
    fb.set(mine, true);
    mpPresenceRef = mine;
  });
}

function mpRemovePresence() {
  if (mpConnListener) { mpConnListener(); mpConnListener = null; }
  if (mpPresenceRef && window.syllyFirebase) { try { window.syllyFirebase.remove(mpPresenceRef); } catch (_) {} }
  mpPresenceRef = null;
}

// Host: watch every seat but its own for the length of the match.
function mpStartPresenceWatcher() {
  const fb = window.syllyFirebase;
  if (!fb || !mpActiveRoomCode) return;
  if (mpPresenceListener) { mpPresenceListener(); mpPresenceListener = null; }
  mpPresenceListener = fb.onValue(fb.ref(`rooms/${mpActiveRoomCode}/presence`), snap => {
    if (window.syllyMultiplayerMode !== 'host' || !mpMatchLive) return;
    // The last child leaving ERASES the node — exists() false means nobody is here.
    const present = (snap.exists() && snap.val()) || {};
    mpSeats.forEach((uid, idx) => {
      // The host is never Away (a host drop deletes the room) — and it is matched by
      // uid, because a 'teams' roster reorders the slots and it is not always seat 0.
      if (!uid || uid === window.syllyDeviceUid) return;
      const kids = present[uid];
      const here = !!kids && typeof kids === 'object' && Object.keys(kids).length > 0;
      if (here) {
        mpCancelAwayPending(idx);
        if (mpAwaySeats.has(idx)) mpMarkBack(idx);
      } else if (!mpAwaySeats.has(idx) && !mpAwayPending.has(idx)) {
        // Debounced: a blip that heals inside MP_AWAY_DEBOUNCE_MS never pauses the table —
        // and the same window absorbs the instant at GAME_START before a client's first
        // presence write lands (this watcher starts BEFORE GAME_START goes out).
        mpAwayPending.set(idx, setTimeout(() => { mpAwayPending.delete(idx); mpMarkAway(idx); }, MP_AWAY_DEBOUNCE_MS));
      }
    });
  });
}

function mpCancelAwayPending(idx) {
  const t = mpAwayPending.get(idx);
  if (t) { clearTimeout(t); mpAwayPending.delete(idx); }
}

function mpClearAwayPending() {
  mpAwayPending.forEach(t => clearTimeout(t));
  mpAwayPending.clear();
}

// pause() on the FIRST seat to go and resume() on the LAST to come back — never twice.
function mpMarkAway(idx) {
  if (!mpMatchLive || mpAwaySeats.has(idx)) return;
  const first = mpAwaySeats.size === 0;
  mpAwaySeats.add(idx);
  if (first) {
    const rc = mpActiveGameConfig?.reconnect;
    if (rc) { try { rc.pause(); } catch (e) { console.warn('[MP] reconnect.pause', e); } }
    else mpArmAwayGrace();
  }
  mpBroadcastAway();
}

function mpMarkBack(idx) {
  if (!mpAwaySeats.delete(idx)) return;
  if (mpAwaySeats.size === 0) {
    if (mpAwayTimer) { clearTimeout(mpAwayTimer); mpAwayTimer = null; }
    const rc = mpActiveGameConfig?.reconnect;
    if (rc) { try { rc.resume(); } catch (e) { console.warn('[MP] reconnect.resume', e); } }
  }
  mpBroadcastAway();
}

// One packet carries the WHOLE away set; an empty set closes every overlay.
// seats: [] is ERASED by Firebase — the receiver rebuilds it with `|| []`.
function mpBroadcastAway() {
  const seats = [...mpAwaySeats].sort((a, b) => a - b);
  const grace = (seats.length && !mpActiveGameConfig?.reconnect) ? mpAwayGraceEndsAt : 0;
  try { mpSendEnvelope({ type: 'LOBBY', payload: { action: 'MP_AWAY_STATE', seats, graceEndsAt: grace } }); } catch (_) {}
  mpShowAwayOverlay(seats, grace);   // the host's own copy — its sends never come back to it
}

function mpAwayNames(seats) {
  const n = seats.map(i => (mpPlayerSlots[i] && mpPlayerSlots[i].nickname) || ('Player ' + (i + 1)));
  if (n.length <= 1) return n[0] || 'a player';
  return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
}

function mpShowAwayOverlay(seats, graceEndsAt) {
  if (mpAwayTick) { clearInterval(mpAwayTick); mpAwayTick = null; }
  const ov = document.getElementById('mp-away-overlay');
  if (!ov) return;
  if (!seats.length) { ov.style.display = 'none'; return; }
  document.getElementById('mp-away-heading').textContent = `Waiting for ${mpAwayNames(seats)}…`;
  const host = window.syllyMultiplayerMode === 'host';
  document.getElementById('btn-mp-away-end').style.display   = host ? '' : 'none';
  document.getElementById('btn-mp-away-leave').style.display = host ? 'none' : '';
  const sub = document.getElementById('mp-away-sub');
  const paint = () => {
    if (!graceEndsAt) { sub.textContent = 'Their seat is saved. The game picks up the moment they are back.'; return; }
    const s = Math.max(0, Math.ceil((graceEndsAt - Date.now()) / 1000));
    sub.textContent = `The game ends in ${s}s if they are not back.`;
  };
  paint();
  if (graceEndsAt) mpAwayTick = setInterval(paint, 1000);
  ov.style.display = 'flex';
}

// Task 4 replaces this stub with the real grace window.
function mpArmAwayGrace() {}

// Wired from the DOMContentLoaded block. Its own function so a harness can wire the
// reconnect buttons without firing every other listener in that block.
function mpWireReconnect() {
  document.getElementById('btn-mp-away-end').addEventListener('click', () => {
    playExit();
    document.getElementById('mp-away-overlay').style.display = 'none';
    resetToLobby();                      // host: HOST_END_GAME + room teardown
  });
  document.getElementById('btn-mp-away-leave').addEventListener('click', () => {
    playExit();
    document.getElementById('mp-away-overlay').style.display = 'none';
    mpNotifyPlayerLeft();                // the quit contract, unchanged
    resetToLobby();
  });
}
```

- [ ] **Step 5: Wire it into the existing flow** — five small edits:

(a) `mpStopListeners()`: add two lines before its closing brace:

```js
  if (mpPresenceListener) { mpPresenceListener(); mpPresenceListener = null; }
  if (mpConnListener)     { mpConnListener();     mpConnListener     = null; }
```

(b) `mpConfirmRoster()`: directly after
`if (mpPlayersListener) { mpPlayersListener(); mpPlayersListener = null; }`, add:

```js

  // Freeze the seats and start watching presence BEFORE GAME_START goes out: a
  // client's first presence write can land the instant it applies GAME_START.
  await mpBeginMatchSeats();
```

(c) The client `GAME_START` applier: after `window.mpLobbyRoster = env.payload.rosterData || null;`, add:

```js
      mpSeats     = slots.map(p => p.uid);
      mpMatchLive = true;
      mpStartPresence();
```

(d) The `LOBBY` branch of `mpHandleEnvelope`: add after the `HOST_END_GAME` `if` block:

```js
    if (env.payload.action === 'MP_AWAY_STATE' && window.syllyMultiplayerMode === 'client') {
      const seats = Array.isArray(env.payload.seats) ? env.payload.seats.map(Number) : [];
      mpShowAwayOverlay(seats, Number(env.payload.graceEndsAt) || 0);
    }
```

(e) The first line inside `document.addEventListener('DOMContentLoaded', () => {`:

```js
  mpWireReconnect();
```

- [ ] **Step 6: Add the overlay markup** to `src/screens/_mp.html`, directly after the closing
  `</div>` of `mp-host-disconnected-overlay`. There is deliberately no cancel/close id, so a backdrop
  tap can't dismiss it:

```html
  <!-- mp-away-overlay (decision modal z-[100]) — a seat dropped mid-match (SW v236).
       Host: End session. Client: Leave. Deliberately NO cancel/close id — the backdrop
       tap-to-dismiss must never hide a table that is genuinely waiting. -->
  <div id="mp-away-overlay" style="display:none"
    class="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-cyan-300">
      <p class="text-4xl">📶</p>
      <h3 id="mp-away-heading" class="text-lg font-bold text-stone-800">Waiting…</h3>
      <p id="mp-away-sub" class="text-stone-500 text-sm"></p>
      <button id="btn-mp-away-end"
        class="min-h-14 w-full rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-semibold text-lg transition-all duration-150">
        End session
      </button>
      <button id="btn-mp-away-leave"
        class="min-h-14 w-full rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-semibold text-lg transition-all duration-150">
        Leave
      </button>
    </div>
  </div>
```

Then run: `node tools/build-index.js && node tools/verify-build-fresh.js`

- [ ] **Step 7: Run the harness**

Run: `node tools/verify-mp-reconnect.js`
Expected: ALL CHECKS PASSED, including sections 4–9.

- [ ] **Step 8: Run the neighbours**

Run: `node tools/verify-mp-configs.js && node tools/verify-comb-loopback.js`
Expected: both all-passed. (Honeycomb Hills doesn't adopt yet, and `mpConfirmRoster`'s new await is
invisible to it.)

- [ ] **Step 9: Commit**

```bash
git add js/engine-multiplayer.js src/screens/_mp.html index.html tools/verify-mp-reconnect.js
git commit -m "feat(mp): frozen seats, per-connection presence, the Away overlay" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The non-adopter's grace, the reasoned end, teardown, and the rejoin key

**Files:**
- Modify: `js/engine-multiplayer.js`:
  - replace the `mpArmAwayGrace` stub;
  - add grace/teardown/key helpers;
  - `HOST_END_GAME` and `LOBBY_RESET` handlers;
  - `mpReturnToLobby`;
  - the client `GAME_START` applier.
- Modify: `js/engine.js` — `resetToLobby()`, one line
- Modify: `src/screens/_mp.html` — ids on `mp-host-disconnected-overlay`'s `<h3>` and `<p>`
- Test: `tools/verify-mp-reconnect.js`

**Interfaces:**
- Consumes (Task 3): `mpAwaySeats`, `mpAwayTimer`, `mpAwayGraceEndsAt`, `mpShowAwayOverlay`,
  `mpRemovePresence`, `mpClearAwayPending`, `mpPresenceListener`.
- Produces: `mpArmAwayGrace()`, `mpAwayGraceExpired()`, `mpEndMatchLocal()`, `mpReconnectTeardown()`,
  `mpWriteRejoinKey()`, `mpClearRejoinKey()`, `mpReadRejoinKey()` → `{code, game, ts} | null`, and
  `HOST_END_GAME` now optionally carries `{ reason: 'dropped', name }`.

- [ ] **Step 1: Write the failing checks:**

```js
    section('10. A game without reconnect: 20 s of grace, then a reasoned end');
    {
      const { host, clients } = await startMatch('plain', ['Ali', 'Bec', 'Cam']);
      const [c1, c2] = clients;
      c1.net.kill();
      advance(3000); await flush();
      ok('the table is waiting', c2.shown('mp-away-overlay'));
      check('with a countdown', c2.el('mp-away-sub').textContent, 'The game ends in 20s if they are not back.');
      advance(19999); await flush();
      check('the host has not given up yet', host.S.__resets, 0);
      advance(1); await flush();
      check('then the host ends the session', host.S.__resets, 1);
      ok('the other client saw the disconnect overlay', c2.shown('mp-host-disconnected-overlay'));
      check('  …with the reason', c2.el('mp-host-disconnected-body').textContent,
            "Bec dropped out, so the game can't carry on. You'll be returned to the lobby.");
      ok('  …and the away overlay closed', !c2.shown('mp-away-overlay'));
    }

    section('11. A blip inside the grace: back before the end, nothing lost');
    {
      const { host, clients } = await startMatch('plain', ['Ali', 'Bec']);
      const [c1] = clients;
      c1.net.drop();
      advance(8000); await flush();
      ok('Away after the debounce', host.run('mpAwaySeats.has(1)'));
      c1.net.heal(); await flush();
      check('back, and the grace was cancelled', [host.run('[...mpAwaySeats]'), host.run('mpAwayTimer')], [[], null]);
      advance(30000); await flush();
      check('the session did NOT end', host.S.__resets, 0);
      ok('the overlay closed on the client', !c1.shown('mp-away-overlay'));
    }

    section('12. Deliberate quit still dissolves — the contract is untouched');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec', 'Cam']);
      const [c1] = clients;
      c1.run('mpNotifyPlayerLeft(); resetToLobby();');
      await flush();
      check('the host dissolved the room', host.S.__resets, 1);
      check('teardown left nothing running on the host',
            [host.run('mpMatchLive'), host.run('mpPresenceListener'), host.timers.length], [false, null, 0]);
    }

    section('13. The rejoin key: adopters only, cleared by every deliberate exit');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec']);
      const [c1] = clients;
      const key = JSON.parse(c1.phone.store.sylly_rejoin || 'null');
      check('a client of an adopting game wrote the key', key && [key.code, key.game], [host.run('mpActiveRoomCode'), 'rcgame']);
      ok('the host writes none', !host.phone.store.sylly_rejoin);
      c1.run('resetToLobby()');
      ok('resetToLobby() cleared it', !c1.phone.store.sylly_rejoin);
      const plain = await startMatch('plain', ['Ali', 'Bec']);
      ok('a non-adopting game never writes it', !plain.clients[0].phone.store.sylly_rejoin);
      ok('engine.js resetToLobby() calls mpReconnectTeardown()',
         /function resetToLobby[\s\S]*?mpReconnectTeardown\(\)/.test(fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8')));
    }

    section('14. LOBBY_RESET: the next match starts clean');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec']);
      const [c1] = clients;
      host.run('mpReturnToLobby()'); await flush();
      const code = host.run('mpActiveRoomCode');
      check('seats and presence are gone from the room', [server.read(`rooms/${code}/seats`), server.read(`rooms/${code}/presence`)], [undefined, undefined]);
      check('the client dropped its match state', [c1.run('mpMatchLive'), c1.run('mpSeats')], [false, []]);
      ok('  …and its rejoin key', !c1.phone.store.sylly_rejoin);
      c1.net.kill(); advance(10000); await flush();
      check('a drop between matches marks nobody Away', host.run('[...mpAwaySeats]'), []);
    }
```

- [ ] **Step 2: Run, watch the failures**

Run: `node tools/verify-mp-reconnect.js`
Expected: FAIL in section 10 (`with a countdown`: the stub never arms a grace).

- [ ] **Step 3: Replace the stub** `function mpArmAwayGrace() {}` (and its comment line) with:

```js
function mpArmAwayGrace() {
  if (mpAwayTimer) clearTimeout(mpAwayTimer);
  mpAwayGraceEndsAt = Date.now() + MP_AWAY_GRACE_MS;
  mpAwayTimer = setTimeout(mpAwayGraceExpired, MP_AWAY_GRACE_MS);
}

function mpAwayGraceExpired() {
  mpAwayTimer = null;
  if (!mpAwaySeats.size || window.syllyMultiplayerMode !== 'host') return;
  // Say WHY first. resetToLobby()'s own HOST_END_GAME carries no reason, and a client
  // keeps this copy because the plain packet never overwrites the text.
  const name = mpAwayNames([...mpAwaySeats]);
  try { mpSendEnvelope({ type: 'LOBBY', payload: { action: 'HOST_END_GAME', reason: 'dropped', name } }); } catch (_) {}
  resetToLobby();
}

// The match is over for THIS device, but the room may not be (LOBBY_RESET).
function mpEndMatchLocal() {
  if (mpPresenceListener) { mpPresenceListener(); mpPresenceListener = null; }
  mpRemovePresence();
  mpClearAwayPending();
  if (mpAwayTimer)   { clearTimeout(mpAwayTimer);   mpAwayTimer   = null; }
  if (mpRejoinTimer) { clearTimeout(mpRejoinTimer); mpRejoinTimer = null; }
  mpSeats = []; mpMatchLive = false; mpAwayGraceEndsAt = 0;
  mpAwaySeats.clear();
  mpShowAwayOverlay([], 0);              // also clears the countdown interval
}

// Everything reconnect owns, from resetToLobby(). Every deliberate exit ends here.
function mpReconnectTeardown() {
  mpEndMatchLocal();
  mpClearRejoinKey();
  const h = document.getElementById('mp-host-disconnected-heading');
  const b = document.getElementById('mp-host-disconnected-body');
  if (h) h.textContent = 'Host Disconnected';
  if (b) b.textContent = "The host left the session. You'll be returned to the lobby.";
  const r = document.getElementById('mp-rejoin-overlay');
  if (r) r.style.display = 'none';
}

// ── sylly_rejoin — a POINTER to a session, never game state (the 4th localStorage
//    exception, CLAUDE.md § Anti-Patterns). Written only for a game that adopts
//    reconnect: for any other game a reload cannot be rescued, and a prompt would lie.
function mpWriteRejoinKey() {
  if (!mpActiveGameConfig?.reconnect || !mpActiveRoomCode || !mpActiveGame) return;
  try {
    localStorage.setItem(MP_REJOIN_KEY, JSON.stringify({ code: mpActiveRoomCode, game: mpActiveGame, ts: Date.now() }));
  } catch (_) {}
}

function mpClearRejoinKey() { try { localStorage.removeItem(MP_REJOIN_KEY); } catch (_) {} }

// Null unless the key is well-formed, fresh, and names a game that still adopts
// reconnect. A bad key is cleared on the way past; a blocked store returns null.
function mpReadRejoinKey() {
  let raw = null, v = null;
  try { raw = localStorage.getItem(MP_REJOIN_KEY); } catch (_) { return null; }
  if (!raw) return null;
  try { v = JSON.parse(raw); } catch (_) { v = null; }
  const fresh = !!v && typeof v.code === 'string' && /^[A-Za-z0-9]{4}$/.test(v.code)
    && typeof v.game === 'string' && !!MP_GAME_CONFIGS[v.game] && !!MP_GAME_CONFIGS[v.game].reconnect
    && Math.abs(Date.now() - (Number(v.ts) || 0)) < MP_REJOIN_TTL_MS;
  if (!fresh) { mpClearRejoinKey(); return null; }
  return v;
}
```

- [ ] **Step 4: The handlers.**

(a) Replace the `HOST_END_GAME` block in the `LOBBY` branch:

```js
    if (env.payload.action === 'HOST_END_GAME') {
      document.getElementById('mp-host-disconnected-overlay').style.display = 'flex';
    }
```

with:

```js
    if (env.payload.action === 'HOST_END_GAME') {
      mpShowAwayOverlay([], 0);
      mpClearRejoinKey();                  // the session is over — never offer to rejoin it
      if (env.payload.reason === 'dropped') {
        document.getElementById('mp-host-disconnected-heading').textContent = 'Game Over';
        document.getElementById('mp-host-disconnected-body').textContent =
          `${env.payload.name || 'A player'} dropped out, so the game can't carry on. You'll be returned to the lobby.`;
      }
      document.getElementById('mp-host-disconnected-overlay').style.display = 'flex';
    }
```

(b) The client `LOBBY_RESET` block: make its first two lines

```js
      mpEndMatchLocal();
      mpClearRejoinKey();
```

(c) `mpReturnToLobby()`, host branch: add at the top of `if (window.syllyMultiplayerMode === 'host') {`:

```js
    mpEndMatchLocal();
    // seats/presence describe the match that just ended — the next one may seat a stranger.
    if (window.syllyFirebase && mpActiveRoomCode) {
      try { window.syllyFirebase.remove(window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/seats`)); } catch (_) {}
      try { window.syllyFirebase.remove(window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/presence`)); } catch (_) {}
    }
```

(d) The client `GAME_START` applier: after the `mpStartPresence();` added in Task 3, add
`mpWriteRejoinKey();`

(e) The `mpRoomListener` callback inside `mpClientJoinRoom` (room gone): add `mpClearRejoinKey();`
after `mpStopListeners();`.

- [ ] **Step 5: `js/engine.js` `resetToLobby()`.** Directly after the line
  `document.body.classList.remove('mp-sync-locked');`, add:

```js
  if (typeof mpReconnectTeardown === 'function') mpReconnectTeardown();   // presence, away overlay, rejoin key (SW v236)
```

- [ ] **Step 6: Markup ids.** In `src/screens/_mp.html`, `mp-host-disconnected-overlay`: give the
  `<h3>` `id="mp-host-disconnected-heading"` and the `<p>` `id="mp-host-disconnected-body"`. The text
  stays as it is. Then run `node tools/build-index.js && node tools/verify-build-fresh.js`.

- [ ] **Step 7: Run it**

Run: `node tools/verify-mp-reconnect.js && node tools/verify-mp-configs.js`
Expected: both all-passed.

- [ ] **Step 8: Commit**

```bash
git add js/engine-multiplayer.js js/engine.js src/screens/_mp.html index.html tools/verify-mp-reconnect.js
git commit -m "feat(mp): 20 s grace for games without reconnect; reasoned end; teardown; sylly_rejoin" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The rejoin protocol

**Files:**
- Modify: `js/engine-multiplayer.js`:
  - the reconnect section;
  - `mpHandleEnvelope` (top, `HANDSHAKE`, `LOBBY` branch);
  - `mpClientJoinRoom`.
- Modify: `src/screens/_mp.html` — add `#mp-rejoin-overlay` after `#mp-away-overlay`
- Test: `tools/verify-mp-reconnect.js`

**Interfaces:**
- Consumes: Tasks 2–4 (`mpApplySettings`, `mpSeats`, `mpMarkBack`, `mpCancelAwayPending`,
  `mpWriteRejoinKey`, `mpClearRejoinKey`, `mpEndMatchLocal`, `mpStartPresence`).
- Produces:
  - `async mpRejoinRoom(code)` → `{ ok: boolean, reason?: 'offline'|'gone' }`;
  - `mpHostHandleRejoin(uid, version)`;
  - `mpApplyRejoinAccept(p)`;
  - `mpRejoinFailed(reason)`;
  - `mpAbandonSession()`;
  - `mpArmRejoinTimeout()`;
  - `mpWatchRoomGone()`;
  - `MP_REJOIN_COPY`.
- Packets:
  - `ACTION MP_REJOIN { version }` (client → host);
  - private `LOBBY MP_REJOIN_ACCEPT { game, playerSlots, mpLobbyStyle, rosterData, gameSettings }`;
  - private `LOBBY MP_REJOIN_REFUSE { reason: 'not-seated'|'version'|'unsupported'|'in-progress' }`.
- The adopting game's `reconnect.sendState(seatIdx)` is called **after** the ACCEPT and **after**
  `mpMarkBack` (resume first, so the snapshot carries a live clock).

- [ ] **Step 1: Write the failing checks.** A "reload" kills the old socket and boots a fresh vm
  with the same uid and the same phone:

```js
    // A reload: the socket dies, memory is gone, the phone (localStorage) survives.
    // The clock moves on first: mpJoinListenFrom filters with `<`, so an event stamped in
    // the SAME millisecond as the rejoin would replay (GAME_START included) — a real
    // reload never lands in the same ms as the last packet, so the harness must not either.
    const reload = (dev, opts) => { dev.net.kill(opts); advance(50); return boot(dev.name + "'", dev.uid, dev.phone); };

    section('15. Reload → rejoin by the room code → the same seat');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec', 'Cam']);
      const [c1, c2] = clients;
      const code = host.run('mpActiveRoomCode');
      advance(1000);
      const back = reload(c1);
      advance(3000); await flush();
      ok('the host marked seat 1 Away', host.run('mpAwaySeats.has(1)'));
      advance(50);                          // see reload(): never rejoin in the same ms as a packet
      back.run(`mpRejoinRoom('${code}')`); await flush();
      check('the rejoiner is in seat 1 again', back.run('mpMyPlayerIdx'), 1);
      check('  …with the same slots and game', [back.run('mpPlayerSlots.map(p => p.nickname)'), back.run('mpActiveGame')], [['Ali', 'Bec', 'Cam'], 'rcgame']);
      check('it ran onPassThePhone as a client', back.S.__rc, ['onPassThePhone:client']);
      check('the host resumed, then sent the snapshot to seat 1', host.S.__rc.slice(-2), ['resume', 'sendState:1']);
      const got = back.inbox.map(e => e.payload && e.payload.action);
      ok('ACCEPT arrived before the snapshot', got.indexOf('MP_REJOIN_ACCEPT') >= 0 && got.indexOf('MP_REJOIN_ACCEPT') < got.indexOf('TEST_STATE'), got.join(','));
      ok('the away overlay closed on the other client', !c2.shown('mp-away-overlay'));
      check('seat 1 is present again on the server', Object.keys(server.read(`rooms/${code}/presence/u1`) || {}).length, 1);
      ok('the rejoiner wrote the key again', !!back.phone.store.sylly_rejoin);
      check('no errors anywhere', errorsOf([host, back, c2]), []);
    }

    section('16. A rejoin that beats the Away mark is still accepted');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec']);
      const code = host.run('mpActiveRoomCode');
      const back = reload(clients[0], { late: true });   // the server has not noticed yet
      back.run(`mpRejoinRoom('${code}')`); await flush();
      check('accepted into seat 1', back.run('mpMyPlayerIdx'), 1);
      check('no pause/resume was needed', host.S.__rc.filter(x => x === 'pause' || x === 'resume'), []);
    }

    section('17. Refusals: a stranger, a version, a game without reconnect');
    {
      const { host, code } = await startMatch('rcgame', ['Ali', 'Bec']);
      const stranger = boot('s', 'uX', makePhone());
      stranger.run(`mpActiveGame = 'rcgame'; mpActiveGameConfig = MP_GAME_CONFIGS.rcgame;`);
      code.split('').forEach((ch, j) => { stranger.el('mp-join-c' + (j + 1)).value = ch; });
      stranger.el('mp-join-nickname-input').value = 'Dee';
      stranger.run('mpClientJoinRoom()'); await flush();
      check('a stranger mid-match is refused on the join screen',
            stranger.el('mp-join-status').textContent, 'That match is already under way — ask the host to start a new one.');
      check('  …and never gets a slot', host.run('mpPlayerSlots.length'), 2);
      // The HANDSHAKE race: a stranger whose HANDSHAKE arrives anyway.
      host.run(`mpHandleEnvelope({ type: 'HANDSHAKE', originId: 'uY', payload: { version: 'vTEST', nickname: 'Eve' } })`);
      await flush();
      check('a mid-match HANDSHAKE adds no phantom slot', host.run('mpPlayerSlots.length'), 2);
      // An MP_REJOIN from a uid with no seat — the membership check, by originId.
      host.run(`mpHandleEnvelope({ type: 'ACTION', originId: 'uZ', payload: { action: 'MP_REJOIN', version: 'vTEST' } })`);
      await flush();
      ok('an unseated MP_REJOIN gets no snapshot', !host.S.__rc.some(x => x.startsWith('sendState')), host.S.__rc.join(','));
    }
    {
      const { host, clients, code } = await startMatch('rcgame', ['Ali', 'Bec']);
      const back = reload(clients[0]);
      back.S.SYLLY_VERSION = 'vOLD';
      back.run(`mpRejoinRoom('${code}')`); await flush();
      check('a different version is refused', back.el('mp-rejoin-sub').textContent,
            "Your app is a different version from the host's. Refresh it, then try again.");
      check('  …and the rejoiner stood down', [back.run('window.syllyMultiplayerMode'), back.run('mpActiveRoomCode')], ['single', null]);
      ok('  …and cleared its key', !back.phone.store.sylly_rejoin);
    }
    {
      const { host, clients, code } = await startMatch('plain', ['Ali', 'Bec']);
      const back = reload(clients[0]);
      back.run(`mpRejoinRoom('${code}')`); await flush();
      check('a game without reconnect refuses', back.el('mp-rejoin-sub').textContent,
            "This game can't be rejoined mid-match. Ask the host to start a new one.");
    }

    section('18. Check 5.8 — a rejoin nobody answers fails cleanly at 15 s');
    {
      const { host, clients, code } = await startMatch('rcgame', ['Ali', 'Bec']);
      const back = reload(clients[0]);
      host.net.drop({ late: true });           // the host's socket is gone; the room is not (yet)
      // The manual path arrives with mpActiveGame already set (game → Join). It must be
      // cleared: no game may be routed to until the ACCEPT says which one, and how.
      back.run(`mpActiveGame = 'rcgame'; mpActiveGameConfig = MP_GAME_CONFIGS.rcgame;`);
      back.run(`mpRejoinRoom('${code}')`); await flush();
      check('no game is routed until the ACCEPT', back.run('mpActiveGame'), null);
      advance(14999);
      ok('still waiting', !back.shown('mp-rejoin-overlay'));
      advance(1); await flush();
      check('then it gives up, saying why', back.el('mp-rejoin-sub').textContent, "The table didn't answer. The host may have left.");
      check('  …leaving nothing running', [back.run('window.syllyMultiplayerMode'), back.timers.length], ['single', 0]);
    }

    section('19. Check 5.9 — a public SYNC before the ACCEPT is ignored, not thrown');
    {
      const { host, clients, code } = await startMatch('rcgame', ['Ali', 'Bec']);
      const back = reload(clients[0]);
      back.run(`mpRejoinRoom('${code}').then(() => {})`);
      // Before the host has answered, a game packet arrives on the public channel.
      back.run(`mpHandleEnvelope({ type: 'SYNC', originId: 'uH', payload: { action: 'COMB_DAYLIGHT', endTimestamp: 1 } })`);
      check('it was routed to no game (none is set yet)', back.run('mpActiveGame'), null);
      await flush();
      check('the ACCEPT still landed', back.run('mpActiveGame'), 'rcgame');
      check('no errors', errorsOf([back]), []);
    }
```

- [ ] **Step 2: Run, watch it fail**

Run: `node tools/verify-mp-reconnect.js`
Expected: section 15 FAILs (`mpRejoinRoom is not defined` is reported by the outer catch as "the
run could not finish").

- [ ] **Step 3: Add the protocol** to the reconnect section (after `mpReadRejoinKey`):

```js
const MP_REJOIN_COPY = {
  gone:          'That match has already wrapped up.',
  'not-seated':  'That match has already wrapped up.',
  offline:       'You look to be offline. Reconnect, then try again.',
  version:       "Your app is a different version from the host's. Refresh it, then try again.",
  unsupported:   "This game can't be rejoined mid-match. Ask the host to start a new one.",
  timeout:       "The table didn't answer. The host may have left.",
};

// Client. { ok } means MP_REJOIN is on the wire; the private ACCEPT does the rest.
// mpActiveGame stays NULL until the ACCEPT: a public game SYNC that beats it here
// must route to no game at all (a half-initialised applier is worse than none).
async function mpRejoinRoom(code) {
  const fb = window.syllyFirebase;
  if (!fb || !window.syllyDeviceUid) return { ok: false, reason: 'offline' };
  const roomRef = fb.ref(`rooms/${code}`);
  const snap    = await fb.get(roomRef);
  const room    = snap.exists() ? snap.val() : null;
  if (!room || !mpSeatList(room.seats).includes(window.syllyDeviceUid)) return { ok: false, reason: 'gone' };
  mpActiveRoomCode   = code;
  mpRoomRef          = roomRef;
  mpActiveGame       = null;
  mpActiveGameConfig = null;
  window.syllyMultiplayerMode = 'client';
  mpStartEventListener();              // sets mpJoinListenFrom — nothing older replays
  mpStartPrivateListener();
  mpWatchRoomGone();
  mpStartPresence();
  mpArmRejoinTimeout();
  await mpSendEnvelope({ type: 'ACTION', payload: { action: 'MP_REJOIN', version: SYLLY_VERSION } });
  return { ok: true };
}

function mpArmRejoinTimeout() {
  if (mpRejoinTimer) clearTimeout(mpRejoinTimer);
  mpRejoinTimer = setTimeout(() => { mpRejoinTimer = null; mpRejoinFailed('timeout'); }, MP_REJOIN_TIMEOUT_MS);
}

// Client: the room vanished (host gone, session ended) — the same behaviour a normal
// join has always had, factored out so the rejoin path shares it.
function mpWatchRoomGone() {
  const fb = window.syllyFirebase;
  if (!fb || !mpRoomRef) return;
  if (mpRoomListener) { mpRoomListener(); mpRoomListener = null; }
  mpRoomListener = fb.onValue(mpRoomRef, roomSnap => {
    if (!roomSnap.exists() && window.syllyMultiplayerMode === 'client') {
      document.getElementById('mp-host-disconnected-overlay').style.display = 'flex';
      mpStopListeners();
      mpClearRejoinKey();
      window.syllyMultiplayerMode = 'single';
    }
  });
}

// Host. The seat is taken from the ENVELOPE's originId, never from a payload field.
function mpHostHandleRejoin(uid, version) {
  const refuse = reason => mpSendPrivate(uid, { type: 'LOBBY', payload: { action: 'MP_REJOIN_REFUSE', reason } });
  const idx = mpSeats.indexOf(uid);
  if (!mpMatchLive || idx < 0)   { refuse('not-seated');  return; }
  if (version !== SYLLY_VERSION) { refuse('version');     return; }
  const rc = mpActiveGameConfig?.reconnect;
  if (!rc)                       { refuse('unsupported'); return; }
  // 1. The session context — the same fields GAME_START and SETTINGS_SYNC carry.
  mpSendPrivate(uid, { type: 'LOBBY', payload: {
    action: 'MP_REJOIN_ACCEPT', game: mpActiveGame, playerSlots: mpPlayerSlots,
    mpLobbyStyle: window.mpLobbyStyle, rosterData: window.mpLobbyRoster || null,
    gameSettings: mpSerialiseSettings(mpActiveGame),
  } });
  // 2. Seat back BEFORE the snapshot: resume() re-arms any clock first, so the
  //    snapshot carries the live deadline. The public resume broadcast can beat the
  //    private ACCEPT to this device and be dropped — the snapshot is the reliable carrier.
  mpCancelAwayPending(idx);
  mpMarkBack(idx);
  // 3. The game's own snapshot — private, and pushed after the ACCEPT.
  try { rc.sendState(idx); } catch (e) { console.warn('[MP] reconnect.sendState', e); }
}

// Client: mirrors the GAME_START applier, then hands over to the game.
function mpApplyRejoinAccept(p) {
  if (mpRejoinTimer) { clearTimeout(mpRejoinTimer); mpRejoinTimer = null; }
  const slots = Array.isArray(p.playerSlots) ? p.playerSlots : [];
  const myIdx = slots.findIndex(s => s && s.uid === window.syllyDeviceUid);
  const cfg   = MP_GAME_CONFIGS[p.game];
  if (myIdx < 0 || !cfg || !cfg.reconnect) { mpRejoinFailed('gone'); return; }
  mpActiveGame       = p.game;
  mpActiveGameConfig = cfg;
  // Every adopter so far uses its MP key as its activeGameId (comb). A future adopter
  // whose two ids differ (SS: 'ss' vs 'sylly-signals') must map it here.
  if (typeof activeGameId !== 'undefined') activeGameId = p.game;
  mpApplySettings(p.game, p.gameSettings || {});
  mpPlayerSlots = slots;
  mpMyPlayerIdx = myIdx;
  mpSeats       = slots.map(s => s.uid);
  mpMatchLive   = true;
  if (p.mpLobbyStyle) window.mpLobbyStyle = p.mpLobbyStyle;
  window.mpLobbyRoster = p.rosterData || null;
  mpWriteRejoinKey();
  const ov = document.getElementById('mp-rejoin-overlay');
  if (ov) ov.style.display = 'none';
  if (typeof lobbyLeaveForGame === 'function') lobbyLeaveForGame();
  cfg.onPassThePhone();
}

function mpAbandonSession() {
  if (mpRejoinTimer) { clearTimeout(mpRejoinTimer); mpRejoinTimer = null; }
  mpStopListeners();
  mpEndMatchLocal();
  mpActiveRoomCode = null;
  mpRoomRef        = null;
  window.syllyMultiplayerMode = 'single';
}

function mpRejoinFailed(reason) {
  mpAbandonSession();
  mpClearRejoinKey();
  const ov = document.getElementById('mp-rejoin-overlay');
  if (!ov) return;
  document.getElementById('mp-rejoin-emoji').textContent    = '🕰️';
  document.getElementById('mp-rejoin-heading').textContent  = 'Too late!';
  document.getElementById('mp-rejoin-sub').textContent      = MP_REJOIN_COPY[reason] || MP_REJOIN_COPY.gone;
  document.getElementById('btn-mp-rejoin-go').style.display = 'none';
  document.getElementById('btn-mp-rejoin-cancel').textContent = 'Got it';
  ov.style.display = 'flex';
}
```

- [ ] **Step 4: Route the packets in `mpHandleEnvelope`.**

(a) Right after the generic `MP_PLAYER_LEFT` block at the top:

```js
  // Reconnect — checked before any per-game routing, like the quit contract above.
  if (env.type === 'ACTION' && env.payload?.action === 'MP_REJOIN') {
    if (window.syllyMultiplayerMode === 'host') mpHostHandleRejoin(env.originId, env.payload.version);
    return;
  }
```

(b) First lines inside `if (env.type === 'HANDSHAKE' && window.syllyMultiplayerMode === 'host') {`:

```js
    if (mpMatchLive) {                 // mid-match: never a phantom slot
      mpSendPrivate(env.originId, { type: 'LOBBY', payload: { action: 'MP_REJOIN_REFUSE', reason: 'in-progress' } });
      return;
    }
```

(c) In the `LOBBY` branch, after the `MP_AWAY_STATE` block:

```js
    if (env.payload.action === 'MP_REJOIN_ACCEPT' && window.syllyMultiplayerMode === 'client') {
      mpApplyRejoinAccept(env.payload);
    }
    if (env.payload.action === 'MP_REJOIN_REFUSE' && window.syllyMultiplayerMode === 'client') {
      if (env.payload.reason === 'in-progress') {
        // A stranger's HANDSHAKE raced the match start: the existing "Match Already Started" modal.
        document.getElementById('mp-roster-mismatch-overlay').style.display = 'flex';
      } else {
        mpRejoinFailed(env.payload.reason);
      }
    }
```

- [ ] **Step 5: `mpClientJoinRoom()` — the manual rejoin and the stranger guard.**

(a) Replace the inline room-gone watcher (the `mpRoomListener = fb.onValue(roomRef, roomSnap => { … });`
block after `mpStartPrivateListener();`) with `mpWatchRoomGone();`.

(b) Directly after `const roomData = snap.val();` (the capacity-check line), add:

```js
      // A live match: the seats are frozen. A uid in them is a player coming BACK —
      // take the rejoin path (no capacity check, no /players slot). Anyone else is
      // turned away here, before a HANDSHAKE could ever reach the host.
      const seatList = mpSeatList(roomData.seats);
      if (seatList.length) {
        if (!seatList.includes(window.syllyDeviceUid)) {
          status.textContent = 'That match is already under way — ask the host to start a new one.';
          status.className   = 'text-red-500 text-sm text-center mt-2';
          btn.textContent    = 'Enter Room →';
          btn.disabled       = false;
          mpUpdateJoinCta();
          return;
        }
        status.textContent = 'Found your seat — getting you back in…';
        status.className   = 'text-stone-500 text-sm text-center mt-2';
        btn.textContent    = 'Rejoining…';
        const r = await mpRejoinRoom(code);
        if (!r.ok) { mpRejoinFailed(r.reason); btn.textContent = 'Enter Room →'; btn.disabled = false; mpUpdateJoinCta(); }
        return;
      }
```

Note: `const roomData = snap.val();` currently sits under the `// Capacity check` comment, and the
lines above must stay above it.

- [ ] **Step 6: Markup.** Add to `src/screens/_mp.html` after `#mp-away-overlay`. **Not now**'s id
  ends in `cancel`, so a backdrop tap dismisses it through the engine's delegated listener:

```html
  <!-- mp-rejoin-overlay (decision modal z-[90]) — the boot prompt for a dropped player,
       and the rejoin's failure copy (SW v236). Rejoin takes the game's brandBtnClass at
       runtime; "Not now" is the neutral cancel, so a backdrop tap dismisses it. -->
  <div id="mp-rejoin-overlay" style="display:none"
    class="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-cyan-300">
      <p id="mp-rejoin-emoji" class="text-4xl">📶</p>
      <h3 id="mp-rejoin-heading" class="text-lg font-bold text-stone-800"></h3>
      <p id="mp-rejoin-sub" class="text-stone-500 text-sm"></p>
      <button id="btn-mp-rejoin-go"
        class="min-h-14 w-full rounded-2xl bg-stone-700 hover:bg-stone-800 active:scale-95 text-white font-semibold text-lg transition-all duration-150">
        Rejoin
      </button>
      <button id="btn-mp-rejoin-cancel"
        class="min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-lg transition-all duration-150">
        Not now
      </button>
    </div>
  </div>
```

Then run `node tools/build-index.js && node tools/verify-build-fresh.js`.

- [ ] **Step 7: Run it**

Run: `node tools/verify-mp-reconnect.js && node tools/verify-mp-configs.js`
Expected: both all-passed.

- [ ] **Step 8: Commit**

```bash
git add js/engine-multiplayer.js src/screens/_mp.html index.html tools/verify-mp-reconnect.js
git commit -m "feat(mp): MP_REJOIN — a seated uid gets its seat back; strangers are refused" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Honeycomb Hills adopts reconnect

**Files:**
- Modify: `js/games/comb.js`:
  - state near line 207;
  - `combStartDaylight`;
  - `combSendFullState`;
  - the `COMB_FULL_STATE` applier;
  - a new `COMB_DAYLIGHT` applier;
  - `combResetState`;
  - new `combReconnectPause/Resume`.
- Modify: `js/engine-multiplayer.js` — the `comb` entry in `MP_GAME_CONFIGS` (line ~511)
- Modify: `tools/verify-comb-loopback.js` — the bridge, plus § 26b
- Modify: `tools/verify-mp-configs.js` — § 7
- Test: the full COMB suite

**Interfaces:**
- Consumes: the engine calls `reconnect.sendState(idx)` / `pause()` / `resume()` (host only; `pause`
  on the first Away, `resume` on the last Back; `sendState` after `resume`).
- Produces:
  - `combPaused` (bool), `combPausedDaylightMs` (number);
  - `combReconnectPause()`, `combReconnectResume()`;
  - packet `SYNC COMB_DAYLIGHT { endTimestamp: number }`, where 0 means the table is paused;
  - `COMB_FULL_STATE` payload gains `endTimestamp`.

- [ ] **Step 1: Bridge additions.** In `tools/verify-comb-loopback.js`, inside the `BRIDGE` string,
  after `fullState(p)      { combSendFullState(p); },` add:

```js
  rcPause()         { combReconnectPause(); },
  rcResume()        { combReconnectResume(); },
  get paused()      { return combPaused; },
  serial()          { return combSerialiseState(); },
```

- [ ] **Step 2: Write § 26b** (insert immediately before the `// ═══…` line above `section('27. The end of the season');`):

```js
section('26b. Reconnect — pause, a device rebuilt from nothing, resume');
// The engine's reconnect hook (MP_GAME_CONFIGS.comb.reconnect). The engine side is
// proven in tools/verify-mp-reconnect.js; this proves COMB's half over the wire.
ok('seat 1 is acting', nextTurn(1));
const dl1 = H.endTs;
ok('  …on the clock', dl1 > clock.now);
H.setHand(1, [2, 0, 0, 0, 0]); H.setHand(2, [0, 0, 0, 2, 0]);
check('an open dance at the moment of the drop', H.post(1, 2, [1, 0, 0, 0, 0], R(3)).ok, true);
clock.now += 20000;
const left1 = dl1 - clock.now;
sent.length = 0;
H.rcPause();
check('pause stopped the host clock', H.endTs, 0);
check('  …and told every device to stop theirs', lastOf('COMB_DAYLIGHT'), { action: 'COMB_DAYLIGHT', endTimestamp: 0 });
check('  …which they did', [C1.endTs, C2.endTs], [0, 0]);
check('the open dance was called off, and the table told', [!!H.offer, !!C2.offer, !!lastOf('COMB_TRADE_RESOLVED')], [false, false, true]);
H.rcPause();
check('a second pause is a no-op', actions().filter(a => a === 'COMB_DAYLIGHT').length, 1);
clock.now += 5 * 60000;                                   // the table waits five minutes
check('no clock ran while paused', H.endTs, 0);

// Seat 1's phone reloads: a device with NOTHING in memory.
const cli1b = makeDevice('cli1b', 'client', 1, SLOTS);
const C1b = cli1b.__comb;
C1b.seat({ count: 3, names: NAMES, season: 'short', layout: 'tended', wasp: 'steals',
           overflow: 'snug', daylight: 'shortday', bounty: 'endless' });   // mpApplySettings + onPassThePhone
C1b.standby();
CLIENTS[0] = { dev: cli1b, br: C1b, uid: 'u1' };
cli1b.mpSendEnvelope = env => {
  const onWire = wire({ ...env, originId: 'u1', timestamp: clock.now });
  try { H.handle(onWire); } catch (e) { host.__errors.push(`${onWire.payload.action} from u1: ${e.message}`); }
};
cli1b.mpSendPrivate = () => { throw new Error('a client must never write the private channel'); };

H.rcResume();                                             // the engine resumes BEFORE sendState
const resumed = lastOf('COMB_DAYLIGHT');
check('resume re-armed the time that was left', H.endTs - clock.now, left1);
check('  …and broadcast it', resumed.endTimestamp, H.endTs);
check('  …not as a COMB_ACTIONS_BEGIN (a placement would be thrown away)',
      actions().filter(a => a === 'COMB_ACTIONS_BEGIN').length, 0);
check('the other client re-armed', C2.endTs, H.endTs);
H.fullState(1);
check('the rebuilt device reached the meadow', lastScreen(cli1b), 'screen-comb-meadow');
check('  …holding exactly its own hand', C1b.hands[1], H.hands[1]);
ok('  …and nobody else\'s', [0, 2].every(p => (C1b.hands[p] || []).every(v => v === 0)),
   JSON.stringify([C1b.hands[0], C1b.hands[2]]));
check('  …with the clock from the snapshot (check 26b / Review Focus 4)', C1b.endTs, H.endTs);
const pub = s => ({ nodes: s.nodes, edges: s.edges, waspHex: s.waspHex, turn: s.turn, turnNo: s.turnNo,
                    phase: s.phase, supply: s.supply, largestHolder: s.largestHolder, fiercestHolder: s.fiercestHolder });
check('host and rebuilt client agree on everything public', pub(C1b.serial()), pub(H.serial()));
check('a second resume is a no-op', (H.rcResume(), actions().filter(a => a === 'COMB_DAYLIGHT').length), 2);
check('no exception on any device', [...host.__errors, ...cli1b.__errors, ...cli2.__errors], []);

section('26c. A turn that ENTERS actions while paused banks its Daylight');
H.rcPause();
H.endTurn(H.turn);                                        // a new turn begins mid-pause
toActions(H.turn);
check('no clock started', H.endTs, 0);
H.rcResume();
ok('resume armed the full turn', H.endTs - clock.now > 0);
check('no exception on any device', [...host.__errors, ...cli1b.__errors, ...cli2.__errors], []);
// Hand seat 1 back to the ORIGINAL device for §27 onward (they read cli1/C1), resynced
// the same way a rejoiner is — which doubles as a second proof the snapshot repairs a
// device that missed every packet of 26b/26c.
CLIENTS[0] = { dev: cli1, br: C1, uid: 'u1' };
H.fullState(1);
check('the original seat-1 device is back in step', pub(C1.serial()), pub(H.serial()));
check('  …and on the same clock', C1.endTs, H.endTs);
```

- [ ] **Step 3: Run, watch it fail**

Run: `node tools/verify-comb-loopback.js`
Expected: FAIL at 26b (`combReconnectPause is not defined`, reported through the harness's catch).

- [ ] **Step 4: `js/games/comb.js` — state.** After `let combTurnTimer = null; …` (line ~209), add:

```js
let combPaused = false;         // reconnect: the table is waiting on a dropped seat
let combPausedDaylightMs = 0;   // Daylight banked by the pause; 0 = no clock was running
```

- [ ] **Step 5: `combStartDaylight`.** Replace its body so it reads:

```js
function combStartDaylight() {
  const ms = combDaylightMs();
  // Paused by a dropped seat (engine reconnect): bank the whole turn rather than start
  // a clock nobody can play against. combReconnectResume() arms it.
  if (combPaused) { combStopDaylight(); combPausedDaylightMs = ms; return; }
  combStartDaylightAt(ms ? Date.now() + ms : 0);   // All Day: no clock, no timer
}
```

- [ ] **Step 6: The hooks.** Add after `combDaylightExpire()`:

```js
// ── Reconnect hooks (MP_GAME_CONFIGS.comb.reconnect — engine, SW v236) ──────
// HOST ONLY. The engine calls pause() when the FIRST seat drops and resume() when the
// LAST one is back, and calls resume() BEFORE a rejoiner's snapshot is sent — so the
// snapshot carries the live deadline.
function combReconnectPause() {
  if (!combIsAuthority() || combPaused) return;
  combPaused = true;
  combPausedDaylightMs = combTurnEndTs ? Math.max(0, combTurnEndTs - Date.now()) : 0;
  combStopDaylight();
  combBroadcast('COMB_DAYLIGHT', { endTimestamp: 0 });        // every countdown freezes
  // An open dance would auto-decline under Full Dance, or wait on a seat that cannot answer.
  if (combOffer) combOfferAbandon('Someone dropped out, so the dance was called off.');
  combRenderMeadow();
}

function combReconnectResume() {
  if (!combIsAuthority() || !combPaused) return;
  combPaused = false;
  const ms = combPausedDaylightMs;
  combPausedDaylightMs = 0;
  if (ms > 0 && combPhase === 'actions') {
    combStartDaylightAt(Date.now() + ms);
    // Only the clock — NOT a re-send of COMB_ACTIONS_BEGIN, whose applier clears
    // combPlacementMode and would throw away the active player's half-made placement.
    combBroadcast('COMB_DAYLIGHT', { endTimestamp: combTurnEndTs });
  }
  combRenderMeadow();
}
```

- [ ] **Step 7: The clock rides the snapshot.** In `combSendFullState`, change the payload to

```js
  combSendPrivateRepair(playerIdx, 'COMB_FULL_STATE', {
    state, hand, instinct, handCounts: combHandCounts(),
    // Clock state is NOT in combSerialiseState() (by design) — it travels beside it.
    // A rejoiner cannot rely on the public COMB_DAYLIGHT: it may beat the ACCEPT here.
    endTimestamp: combTurnEndTs,
  });
```

In the `case 'COMB_FULL_STATE':` applier, add after
`combPublicCounts = combWireArr(p.handCounts, combPlayerCount, 0).map(v => v | 0);`:

```js
      combStartDaylightAt(p.endTimestamp);    // 0 (paused / All Day) stops any countdown
```

Add a new case directly after the `COMB_FULL_STATE` case:

```js
    // Reconnect's pause (0) and resume (a fresh deadline) — the clock and nothing else.
    case 'COMB_DAYLIGHT':
      combStartDaylightAt(p.endTimestamp);    // Number(), never `| 0` — see the helper
      combRenderMeadow();
      return;
```

- [ ] **Step 8: `combResetState`.** Add `combPaused = false; combPausedDaylightMs = 0;` next to its
  other scalar resets.

- [ ] **Step 9: Register the hook.** In `js/engine-multiplayer.js`, the `comb` entry of
  `MP_GAME_CONFIGS`, after `getMinPlayers:   () => 3,`, add:

```js
    // Client reconnect (SW v236). Arrow wrappers, not bare references: this object is
    // built before comb.js loads, so the functions only exist by call time.
    reconnect: {
      sendState: idx => combSendFullState(idx),
      pause:     () => combReconnectPause(),
      resume:    () => combReconnectResume(),
    },
```

- [ ] **Step 10: `tools/verify-mp-configs.js` § 7.** Insert before the final `// ═══…` summary block:

```js
// ── 7. Client reconnect — the optional hook is whole wherever it is present ─────
// A half-adopted hook is worse than none: the engine calls all three. The adopter list
// is pinned so a new adopter is a deliberate, reviewed change (docs/deferred-work.md).
section('7. Client reconnect — adopters and hook shape');
const ADOPTERS = IDS.filter(id => CONFIGS[id].reconnect !== undefined);
check('the adopters are exactly the reviewed list', ADOPTERS, ['comb']);
for (const id of ADOPTERS) {
  const rc = CONFIGS[id].reconnect;
  ok(id + ': reconnect has sendState, pause and resume',
     ['sendState', 'pause', 'resume'].every(k => typeof rc[k] === 'function'));
}
ok('engine handles MP_REJOIN before per-game routing', /'MP_REJOIN'/.test(engineSrc));
```

- [ ] **Step 11: Run the whole Honeycomb Hills suite + the engine harnesses**

Run: `node tools/verify-comb-board.js && node tools/verify-comb-rules.js && node tools/verify-comb-loop.js && node tools/verify-comb-loopback.js && node tools/verify-mp-configs.js && node tools/verify-mp-reconnect.js`
Expected: every one all-passed.

Run: `node tools/mutate-comb.js` three times.
Expected: `71/71` (or more) killed each run. A surviving mutant in the new code means a check is
missing. Add it to § 26b; don't weaken the mutant.

- [ ] **Step 12: Commit**

```bash
git add js/games/comb.js js/engine-multiplayer.js tools/verify-comb-loopback.js tools/verify-mp-configs.js
git commit -m "feat(comb): adopt client reconnect — pause/resume Daylight, the clock rides the snapshot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The boot prompt, and leaving the lobby cleanly

**Files:**
- Modify: `js/engine-multiplayer.js`:
  - `mpOfferRejoin`, `mpRejoinFromPrompt`;
  - `mpWireReconnect` (two more buttons);
  - the `DOMContentLoaded` block.
- Modify: `js/lobby/lobby-host.js` — `lobbyLeaveForGame()`; `lobbyLaunch()` uses it
- Modify: `tools/visual-lobby.js` — § 16
- Test: `tools/verify-mp-reconnect.js`, `tools/visual-lobby.js`

**Interfaces:**
- Consumes: `mpReadRejoinKey`, `mpClearRejoinKey`, `mpRejoinRoom`, `mpRejoinFailed`,
  `mpArmRejoinTimeout`, `mpAbandonSession`, `mpApplyRejoinAccept` (Tasks 4–5).
- Produces: `mpOfferRejoin()`, `mpRejoinFromPrompt()`, `lobbyLeaveForGame()`.

- [ ] **Step 1: Write the failing harness checks:**

```js
    section('20. The boot prompt: one tap back into the seat');
    {
      const { host, clients, code } = await startMatch('rcgame', ['Ali', 'Bec']);
      const back = reload(clients[0]);
      back.run('mpWireReconnect(); mpOfferRejoin();');
      ok('a fresh key opens the prompt at boot', back.shown('mp-rejoin-overlay'));
      check('  …naming the game and the room', [back.el('mp-rejoin-heading').textContent, back.el('mp-rejoin-sub').textContent],
            ['Back to Test Game?', `You dropped out of room ${code}. The table's waiting for you.`]);
      ok('  …with Rejoin in the game\'s brand', back.el('btn-mp-rejoin-go').className.includes('bg-test'));
      back.el('btn-mp-rejoin-go').click(); await flush();
      check('one tap: back in seat 1', back.run('mpMyPlayerIdx'), 1);
      ok('the prompt closed', !back.shown('mp-rejoin-overlay'));
      check('the lobby was left through lobbyLeaveForGame()', back.S.__leftForGame, 1);
    }

    section('21. Not now: the key goes, the table keeps waiting');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec']);
      const back = reload(clients[0]);
      back.run('mpWireReconnect(); mpOfferRejoin();');
      back.el('btn-mp-rejoin-cancel').click();
      ok('the prompt closed', !back.shown('mp-rejoin-overlay'));
      ok('the key is gone', !back.phone.store.sylly_rejoin);
      back.run('mpOfferRejoin();');
      ok('so the next boot does not ask again', !back.shown('mp-rejoin-overlay'));
    }

    section('22. Checks 6.3–6.6 — keys the prompt must refuse, never throw on');
    {
      const cases = [
        ['6.3 corrupt JSON',        '{not json'],
        ['6.4 three hours old',     JSON.stringify({ code: 'ABCD', game: 'rcgame', ts: clock.now - 3 * 3600000 })],
        ['6.5 a game without reconnect', JSON.stringify({ code: 'ABCD', game: 'plain', ts: clock.now })],
        ['6.5b an unknown game',    JSON.stringify({ code: 'ABCD', game: 'nope', ts: clock.now })],
      ];
      for (const [label, raw] of cases) {
        const phone = makePhone(); phone.store.sylly_rejoin = raw;
        const d = boot('k', 'uK', phone);
        d.run('mpWireReconnect(); mpOfferRejoin();');
        ok(label + ': no prompt', !d.shown('mp-rejoin-overlay'));
        ok(label + ': the bad key was cleared', phone.store.sylly_rejoin === undefined);
        check(label + ': no errors', errorsOf([d]), []);
      }
      const phone = makePhone(); phone.store.sylly_rejoin = JSON.stringify({ code: 'ABCD', game: 'rcgame', ts: clock.now });
      phone.setThrowing(true);
      const d = boot('k', 'uK', phone);
      d.run('mpWireReconnect(); mpOfferRejoin();');
      ok('6.6 storage that throws: no prompt, no throw', !d.shown('mp-rejoin-overlay') && errorsOf([d]).length === 0);
    }

    section('23. A prompt for a match that has ended says so');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec']);
      const back = reload(clients[0]);
      host.run('resetToLobby()'); await flush();          // the host ended it meanwhile
      back.run('mpWireReconnect(); mpOfferRejoin();');
      back.el('btn-mp-rejoin-go').click(); await flush();
      check('the prompt explains', back.el('mp-rejoin-sub').textContent, 'That match has already wrapped up.');
      ok('  …and the key is gone', !back.phone.store.sylly_rejoin);
    }
```

- [ ] **Step 2: Run, watch it fail**

Run: `node tools/verify-mp-reconnect.js`
Expected: section 20 fails (`mpOfferRejoin is not defined`, caught by the outer catch).

- [ ] **Step 3: Add the prompt** to the reconnect section:

```js
// Boot: a fresh sylly_rejoin opens the prompt over whichever lobby layout is up.
function mpOfferRejoin() {
  const k = mpReadRejoinKey();
  if (!k) return;
  const cfg = MP_GAME_CONFIGS[k.game];
  const ov  = document.getElementById('mp-rejoin-overlay');
  if (!ov) return;
  document.getElementById('mp-rejoin-emoji').textContent   = cfg.emoji;
  document.getElementById('mp-rejoin-heading').textContent = `Back to ${cfg.gameName}?`;
  document.getElementById('mp-rejoin-sub').textContent     = `You dropped out of room ${k.code}. The table's waiting for you.`;
  const go = document.getElementById('btn-mp-rejoin-go');
  go.className     = `min-h-14 w-full rounded-2xl ${cfg.brandBtnClass} active:scale-95 text-white font-semibold text-lg transition-all duration-150`;
  go.textContent   = 'Rejoin';
  go.disabled      = false;
  go.style.display = '';
  document.getElementById('btn-mp-rejoin-cancel').textContent = 'Not now';
  ov.style.display = 'flex';
}

function mpRejoinFromPrompt() {
  const k = mpReadRejoinKey();
  if (!k) { mpRejoinFailed('gone'); return; }
  playLaunch();
  const go = document.getElementById('btn-mp-rejoin-go');
  go.disabled = true;
  go.textContent = 'Getting you back in…';
  mpArmRejoinTimeout();                  // also covers Firebase failing to load at all
  syllyLoadFirebase(async () => {
    try {
      const r = await mpRejoinRoom(k.code);
      if (!r.ok) mpRejoinFailed(r.reason);
    } catch (e) {
      console.error('[MP] rejoin failed:', e);
      mpRejoinFailed('gone');
    }
  });
}
```

Add to `mpWireReconnect()`:

```js
  document.getElementById('btn-mp-rejoin-go').addEventListener('click', mpRejoinFromPrompt);
  document.getElementById('btn-mp-rejoin-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('mp-rejoin-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') mpAbandonSession();
    mpClearRejoinKey();
  });
```

And in the `DOMContentLoaded` block, directly under the `mpWireReconnect();` line from Task 3:

```js
  mpOfferRejoin();                       // a dropped player's one-tap way back (SW v236)
```

- [ ] **Step 4: `js/lobby/lobby-host.js`.** Replace `lobbyLaunch()`'s two TV lines

```js
  const tvRoot = document.getElementById('tv-app');
  if (tvRoot) tvDrop(tvRoot);
```

with `lobbyLeaveForGame();`, and add directly above `function lobbyLaunch`:

```js
/* Everything that must stop when a game takes the screen while `view` stays put.
   Shared by lobbyLaunch() and the reconnect prompt's rejoin (engine-multiplayer.js
   mpApplyRejoinAccept), which enters a game WITHOUT a lobby button — so the two can
   never drift. The Lounge's room is stopped too: at boot on a widescreen the prompt
   sits over the Lounge with its room running, and only router state stops that loop
   otherwise. lobbyApply resumes it on the way back (roomUp). */
function lobbyLeaveForGame() {
  const tvRoot = document.getElementById('tv-app');
  if (tvRoot) tvDrop(tvRoot);
  if (lobbyScene && typeof lobbyScene.stop === 'function') lobbyScene.stop();
}
```

**Before accepting this edit:** grep `lobbyLaunch(` callers. If a game is ever launched from the
Lounge itself, stopping the room there is new behaviour. Confirm that `resetToLobby()` → `lobbyShow`
→ `lobbyApply` resumes it: section 16b below asserts exactly that.

- [ ] **Step 5: `tools/visual-lobby.js` § 16.** Insert before the line
  `ok(errs.length === 0, 'no page errors on any device' …`:

```js
    section('16 — the reconnect prompt over the real lobby (SW v236)');
    {
      const { ctx, page } = await open({ width: 1280, height: 800 });
      await ctx.addInitScript(() => {
        localStorage.setItem('sylly_rejoin', JSON.stringify({ code: 'ABCD', game: 'comb', ts: Date.now() }));
      });
      await page.goto(base); await booted(page); await settle(page, 400);
      ok(await shown(page, 'mp-rejoin-overlay'), 'a fresh key opens the prompt over the Lounge');
      ok(/Honeycomb Hills/.test(await page.evaluate(() => document.getElementById('mp-rejoin-heading').textContent)), '  …naming the game');
      // 16b: an ACCEPT enters the game WITHOUT a lobby button — the room must stop, then come back.
      await page.evaluate(() => {
        window.syllyDeviceUid = 'uV';
        mpApplyRejoinAccept({ game: 'comb', playerSlots: [{ uid: 'uH', nickname: 'Ali' }, { uid: 'uV', nickname: 'Bec' }, { uid: 'u2', nickname: 'Cam' }],
                              mpLobbyStyle: 'individual', gameSettings: {} });
      });
      await settle(page, 300);
      ok(!await shown(page, 'mp-rejoin-overlay'), '16b the prompt closed');
      ok(await page.evaluate(() => !window.louDebug.isRunning()), '16b the Lounge room stopped when the game took the screen');
      await page.evaluate(() => resetToLobby()); await settle(page, 800);
      ok(await onlyLayout(page, 'lounge') && await page.evaluate(() => window.louDebug.isRunning()), '16b resetToLobby brings the Lounge back, running');
      ok(await page.evaluate(() => localStorage.getItem('sylly_rejoin') === null), '16b teardown cleared the key');
      await ctx.close();
    }
    {
      const { ctx, page } = await open({ width: 1280, height: 800 });
      await ctx.addInitScript(() => { localStorage.setItem('sylly_rejoin', '{not json'); });
      await page.goto(base); await booted(page); await settle(page, 400);
      ok(!await shown(page, 'mp-rejoin-overlay'), 'a corrupt key opens nothing and throws nothing');
      await ctx.close();
    }
```

(`shown()` is the harness's own helper at line 49; the page-error collector already fails the run on
any throw.)

- [ ] **Step 6: Run everything that covers the lobby**

Run: `node tools/verify-mp-reconnect.js && node tools/visual-lobby.js && node tools/verify-lobby-router.js`
Expected: all three all-passed. If `16b resetToLobby brings the Lounge back` fails, the Lounge does
not resume on a same-view return. Fix it in `lobbyShow`/`lobbyApply` (resume when `view === 'lounge'`),
not by dropping the `stop()`.

- [ ] **Step 7: Commit**

```bash
git add js/engine-multiplayer.js js/lobby/lobby-host.js tools/visual-lobby.js tools/verify-mp-reconnect.js
git commit -m "feat(mp): the boot prompt — one tap back into a dropped seat" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: A mutation pass that keeps the reconnect harness honest

**Files:**
- Create: `tools/mutate-mp-reconnect.js`

**Interfaces:**
- Consumes: `tools/verify-mp-reconnect.js`'s `MP_SRC=` override and its summary line
  (`ALL n CHECKS PASSED` / `n of m CHECKS FAILED`).

- [ ] **Step 1: Write the mutation script**

```js
// ═══════════════════════════════════════════════════════════════════════════
// mutate-mp-reconnect.js — each mutant reverts ONE load-bearing reconnect line in a
// temp copy of js/engine-multiplayer.js and drives tools/verify-mp-reconnect.js
// against it. Every mutant must turn the harness RED ("n of m CHECKS FAILED"); a
// crash ("could not finish") also counts as killed, but a green run is a survivor —
// a line the harness does not actually watch.
//
//   node tools/mutate-mp-reconnect.js     (exits 1 if any mutant survives)
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
// Normalised to LF: core.autocrlf is on in this repo, and the multi-line anchors below
// would otherwise read as STALE on a CRLF checkout.
const SRC  = fs.readFileSync(path.join(ROOT, 'js/engine-multiplayer.js'), 'utf8').replace(/\r\n/g, '\n');

const MUTANTS = [
  ['one presence child per connection → one shared node',
   "const mine = fb.push(fb.ref(`rooms/${code}/presence/${uid}`));",
   "const mine = fb.ref(`rooms/${code}/presence/${uid}/only`);"],
  ['the rejoin checks seat membership', 'if (!mpMatchLive || idx < 0)   { refuse', 'if (!mpMatchLive)   { refuse'],
  ['pause only on the FIRST away seat', 'const first = mpAwaySeats.size === 0;', 'const first = true;'],
  ['resume only when the LAST seat is back', 'if (mpAwaySeats.size === 0) {\n    if (mpAwayTimer)', 'if (true) {\n    if (mpAwayTimer)'],
  ['the Away debounce', 'MP_AWAY_DEBOUNCE_MS  = 3000;', 'MP_AWAY_DEBOUNCE_MS  = 0;'],
  ['the host is skipped by uid', "if (!uid || uid === window.syllyDeviceUid) return;", 'if (!uid || idx === 0) return;'],
  ['teardown clears the rejoin key', 'mpEndMatchLocal();\n  mpClearRejoinKey();\n  const h', 'mpEndMatchLocal();\n  const h'],
  ['resume BEFORE the snapshot', "  mpMarkBack(idx);\n  // 3.", "  // 3."],
  ['mid-match HANDSHAKE refused', 'if (mpMatchLive) {                 // mid-match', 'if (false) {                 // mid-match'],
  ['a bad key is cleared', "if (!fresh) { mpClearRejoinKey(); return null; }", 'if (!fresh) { return null; }'],
  ['mpActiveGame stays null until ACCEPT', "  mpActiveGame       = null;\n  mpActiveGameConfig = null;\n  window.syllyMultiplayerMode = 'client';",
   "  window.syllyMultiplayerMode = 'client';"],
];

let survivors = 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mpmut-'));
for (const [label, from, to] of MUTANTS) {
  if (!SRC.includes(from)) { console.log('  STALE  ' + label + ' — anchor not found; update this mutant'); survivors++; continue; }
  const file = path.join(tmp, 'engine-multiplayer.js');
  fs.writeFileSync(file, SRC.replace(from, to));
  const r = spawnSync(process.execPath, [path.join(__dirname, 'verify-mp-reconnect.js')],
    { env: Object.assign({}, process.env, { MP_SRC: file }), encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const killed = r.status !== 0 && /CHECKS FAILED/.test(out);
  if (!killed) survivors++;
  console.log((killed ? '  killed ' : '  SURVIVED ') + label);
}
console.log(`\n${MUTANTS.length - survivors}/${MUTANTS.length} mutants killed`);
process.exit(survivors ? 1 : 0);
```

- [ ] **Step 2: Run it**

Run: `node tools/mutate-mp-reconnect.js`
Expected: `11/11 mutants killed`.
- **A `STALE` line** means an anchor string drifted during implementation: copy the real line into
  the mutant.
- **A `SURVIVED` line** means the harness doesn't watch that behaviour: add a check to
  `verify-mp-reconnect.js` that pins it, and re-run. Never delete a mutant to get green.

- [ ] **Step 3: Commit**

```bash
git add tools/mutate-mp-reconnect.js tools/verify-mp-reconnect.js
git commit -m "test(mp): mutation pass for the reconnect harness" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Version, and the Documentation Integrity Protocol

**Files:**
- Modify: `sw.js`, `CLAUDE.md`, `.claude/rules/logic-engine.md`, `.claude/rules/definitions.md`,
  `docs/code-map.md`, `docs/implementation-notes/shared-implementation-notes.md`,
  `docs/implementation-notes/comb-implementation-notes.md`, `docs/deferred-work.md`,
  `docs/decision-log.md`, `docs/sw-changelog.md`

- [ ] **Step 1: The version.** Read `sw.js` line 4 and `CLAUDE.md` § Current Focus. If `sylly-games-v236`
  still has no entry in `docs/sw-changelog.md`, `CLAUDE.md` or `docs/decision-log.md` (it had none
  on 27 Sep 2026), this work **is** v236, and `CACHE_NAME` stays. Otherwise bump to the next number.
  Either way, update the `// Little Sylly Games — Service Worker vN` comment on line 1 to match.
  `PRECACHE_URLS` gains nothing. The new harness and mutation script live in `tools/` and are never
  served.

- [ ] **Step 2: `CLAUDE.md`.**
  - § Current Focus: move the v235 paragraph **verbatim** to the top of `docs/sw-changelog.md`, then
    write the new ≤6-line SW entry. Name the drop → Away → rejoin behaviour, Honeycomb Hills as first
    adopter, the new harness and its check count, and point to `shared-implementation-notes.md` (the
    new DD number).
  - § Anti-Patterns localStorage exception list: add `sylly_rejoin` (a session pointer
    `{ code, game, ts }`, never game state).
  - § Verification harnesses table: add `verify-mp-reconnect.js` (with its check count) and
    `mutate-mp-reconnect.js` (11/11) rows.

- [ ] **Step 3: `.claude/rules/logic-engine.md`.**
  - Add `### Client Reconnect` after § Mid-Game Quit Contract, ≤25 lines:
    - seats/presence;
    - drop ≠ quit;
    - the `reconnect` hook contract (the three functions, client `onPassThePhone` must be re-runnable,
      the snapshot applier must take standby → live, strip other seats);
    - resume-before-sendState;
    - non-adopter grace.
  - In § Mid-Game Quit Contract, add one line: *"A drop is not a quit — see § Client Reconnect."*
  - In § Timer Lifecycle, add the reconnect handles and their clear site (`mpEndMatchLocal()`).
  - In § localStorage Exception, add `sylly_rejoin`.

- [ ] **Step 4: `.claude/rules/definitions.md`.** Add rows to Technical Project Terms: Seats (frozen
  uid list), Presence (per-connection children), Away, `sylly_rejoin`, `reconnect` hook.

- [ ] **Step 5: `docs/code-map.md`** (Grep for the Multiplayer Module section and offset-read it; never
  read the whole file). Add:
  - the new state variables;
  - the functions from Tasks 2–6;
  - the packets `MP_AWAY_STATE` / `MP_REJOIN` / `MP_REJOIN_ACCEPT` / `MP_REJOIN_REFUSE` and the
    `HOST_END_GAME` reason;
  - the nodes `rooms/{code}/seats` and `rooms/{code}/presence`;
  - the overlays `mp-away-overlay` / `mp-rejoin-overlay`;
  - `lobbyLeaveForGame`;
  - in the COMB section: `combReconnectPause/Resume`, `COMB_DAYLIGHT`, `combPaused`,
    `combPausedDaylightMs`.

- [ ] **Step 6: Implementation notes.**
  - `shared-implementation-notes.md`: one DD entry (What happened → Root cause → Lesson) for the
    design. Also one lesson for the **stale-socket race** (why presence is per connection), and one for
    **cross-listener ordering** (a public packet can beat a private one to the same device, so the
    snapshot carries the clock).
  - `comb-implementation-notes.md`: a one-line pointer to that DD, plus the COMB-specific decision
    (pause abandons an open dance; Daylight banked while paused).

- [ ] **Step 7: `docs/deferred-work.md`.**
  - Mark § ⬆ HIGH PRIORITY — MDLM client reconnect **RESOLVED 27 Sep 2026 (engine half + COMB,
    SW v236)**, keeping the entry.
  - Add a new entry, **Reconnect adoption, per game**: the other MDLM games, longest matches first.
    Each needs a serialiser, a strip, and pause/resume for its clocks. PKO, FLW and CJAR are the first
    candidates.
  - Carry host migration forward as its own item.
  - Add the **real-device pass** as outstanding: lock the iPhone SE mid-Season; check seat, hand and
    clock.

- [ ] **Step 8: `docs/decision-log.md`.** One entry on top (~4 lines): *drops are not quits*; an opt-in
  `reconnect` hook; COMB is the first adopter; pointer to the spec and the DD.

- [ ] **Step 9: Final verification**

Run: `node tools/verify-build-fresh.js && node tools/verify-mp-configs.js && node tools/verify-mp-reconnect.js && node tools/mutate-mp-reconnect.js && node tools/verify-comb-loopback.js && node tools/verify-identity-docs.js`
Expected: every one all-passed. `verify-identity-docs.js` confirms no COMB copy block drifted, since
no identity-doc copy was changed.

- [ ] **Step 10: Commit**

```bash
git add sw.js CLAUDE.md .claude/rules/logic-engine.md .claude/rules/definitions.md docs/code-map.md docs/implementation-notes/shared-implementation-notes.md docs/implementation-notes/comb-implementation-notes.md docs/deferred-work.md docs/decision-log.md docs/sw-changelog.md
git commit -m "docs: client reconnect — SW v236, rules, code map, notes, deferred work" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After the plan: owed, and not replaceable by any harness

A real session on at least two phones, one of them the owner's iPhone SE:
1. Start a Short Summer.
2. Lock the SE for a minute mid-turn and check the other phone shows *"Waiting for …"* and the clock
   froze.
3. Unlock (or reload) and tap **Rejoin**, then check the seat, the hand and the time left.
4. Do it once with a trade open.

Record the outcome in `comb-implementation-notes.md` and close the deferred-work line.
