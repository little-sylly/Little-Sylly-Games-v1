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
function boot(name, uid, phone, skew = 0) {
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
    Date: { now: () => clock.now + skew },
    setTimeout:  (fn, ms) => { timers.push({ fn, at: clock.now + (ms || 0), id: ++seq, repeat: false }); return seq; },
    setInterval: (fn, ms) => { timers.push({ fn, at: clock.now + (ms || 0), id: ++seq, repeat: true, ms: ms || 1000 }); return seq; },
    clearTimeout:  id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    clearInterval: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    showScreen: id => { screens.push(id); if (typeof S.mpNoteScreen === 'function') S.mpNoteScreen(id); },
    MP_PROTOCOL_VERSION: 'vTEST',
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

    section('3. mpApplySettings is the one settings applier');
    {
      const d = boot('solo', 'uS', makePhone());
      ok('mpApplySettings exists', d.run('typeof mpApplySettings') === 'function');
      d.run(`var gmFrequencyRange = 'stable'; mpApplySettings('gm', { gmFrequencyRange: 'chaotic' });`);
      check('it applies a game\'s settings', d.run('gmFrequencyRange'), 'chaotic');
      ok('SETTINGS_SYNC routes through it',
         /action === 'SETTINGS_SYNC'\)\s*\{?\s*mpApplySettings\(mpActiveGame/.test(mpSrc));
    }

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

    section('10. A game without reconnect: 60 s of grace, then the HOST decides (never an automatic end)');
    {
      const { host, clients } = await startMatch('plain', ['Ali', 'Bec', 'Cam']);
      const [c1, c2] = clients;
      host.run('mpWireReconnect();');
      c1.net.kill();
      advance(3000); await flush();
      ok('the table is waiting', c2.shown('mp-away-overlay'));
      check('with a countdown', c2.el('mp-away-sub').textContent, 'Holding their seat for 60s.');
      check('no Keep waiting while the grace runs', host.el('btn-mp-away-wait').style.display, 'none');
      advance(59999); await flush();
      check('the host has not been asked yet', host.run('mpAwayAsking'), false);
      advance(1); await flush();
      check('the grace ran out: the host is ASKED, the session did NOT end', [host.run('mpAwayAsking'), host.S.__resets], [true, 0]);
      check('  …Keep waiting shown on the host', host.el('btn-mp-away-wait').style.display, '');
      check('  …and End session with it', host.el('btn-mp-away-end').style.display, '');
      check('  …the host is asked in words', host.el('mp-away-sub').textContent,
            'Still not back after a minute. Keep waiting, or end the session?');
      check('the other client is told the host is deciding', c2.el('mp-away-sub').textContent,
            'The host is deciding whether to keep waiting.');
      check('  …and gets no Keep waiting of its own', c2.el('btn-mp-away-wait').style.display, 'none');
      advance(600000); await flush();
      check('left unanswered for ten minutes, still nothing ends', host.S.__resets, 0);

      host.el('btn-mp-away-wait').click(); await flush();
      check('Keep waiting: a fresh grace, no longer asking', [host.run('mpAwayAsking'), host.run('mpAwayTimer') !== null], [false, true]);
      check('  …the client sees the countdown again', c2.el('mp-away-sub').textContent, 'Holding their seat for 60s.');
      advance(60000); await flush();
      check('a second grace runs out: asked again', [host.run('mpAwayAsking'), host.S.__resets], [true, 0]);

      host.el('btn-mp-away-end').click(); await flush();
      check('End session: the host ends it', host.S.__resets, 1);
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

    section('15b. The rejoin itself marks the seat back — resume before the snapshot, presence or not');
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec', 'Cam']);
      clients[0].net.kill();
      advance(3000); await flush();
      ok('seat 1 is Away', host.run('mpAwaySeats.has(1)'));
      // MP_REJOIN and presence ride separate Firebase listeners: the rejoin can land first.
      host.run(`mpHandleEnvelope({ type: 'ACTION', originId: 'u1', payload: { action: 'MP_REJOIN', version: 'vTEST' } })`);
      await flush();
      check('the seat is back without waiting on presence', host.run('[...mpAwaySeats]'), []);
      check('resume() ran, and before the snapshot',
            host.S.__rc.filter(x => x === 'resume' || x.startsWith('sendState')), ['resume', 'sendState:1']);
      ok('the other client\'s overlay closed', !clients[1].shown('mp-away-overlay'));
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
      back.S.MP_PROTOCOL_VERSION = 'vOLD';
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

    section('F1. Review C1 — a client leaving the results screen is NOT a drop');
    {
      const { host, clients } = await startMatch('plain', ['Ali', 'Bec', 'Cam']);
      const [c1, c2] = clients;
      c1.run('resetToLobby()'); await flush();      // the podium ✕ — no MP_PLAYER_LEFT
      advance(3100); await flush();
      check('nobody was marked Away', host.run('[...mpAwaySeats]'), []);
      ok('the table is not shown a Waiting overlay', !c2.shown('mp-away-overlay') && !host.shown('mp-away-overlay'));
      advance(25000); await flush();
      check('and the session was not ended', host.S.__resets, 0);
    }
    {
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec']);
      clients[0].run('resetToLobby()'); await flush();
      advance(5000); await flush();
      check('an adopter is not paused by a deliberate exit either', host.S.__rc.filter(x => x === 'pause'), []);
    }

    section('F1b. Review C1 — reaching an end screen ends the match for reconnect');
    {
      const engineSrc = fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8');
      ok('engine.js showScreen tells the multiplayer module', /function showScreen[\s\S]*?mpNoteScreen\(id\)/.test(engineSrc));
      const d0 = boot('probe', 'uP', makePhone());
      const ends = d0.run('[...MP_END_SCREENS]');
      const all = (engineSrc.match(/const allScreens = \[[\s\S]*?\];/) || [''])[0];
      ok('every end screen is a registered screen', ends.length >= 18 && ends.every(id => all.includes("'" + id + "'")),
         ends.filter(id => !all.includes("'" + id + "'")).join(', '));
      const { host, clients } = await startMatch('rcgame', ['Ali', 'Bec', 'Cam']);
      const [c1, c2] = clients;
      [host, c1, c2].forEach(d => d.run(`showScreen('${ends[0]}')`));
      check('the match is over on every device', [host, c1, c2].map(d => d.run('mpMatchLive')), [false, false, false]);
      ok('a client at the podium drops its rejoin key', !c1.phone.store.sylly_rejoin);
      c1.net.kill(); advance(5000); await flush();
      check('a phone locking at the podium marks nobody Away', host.run('[...mpAwaySeats]'), []);
      check('  …and pauses nothing', host.S.__rc.filter(x => x === 'pause'), []);
      host.run(`mpHandleEnvelope({ type: 'ACTION', originId: 'u1', payload: { action: 'MP_REJOIN', version: 'vTEST' } })`);
      await flush();
      ok('a rejoin after the match is over gets no snapshot', !host.S.__rc.some(x => x.startsWith('sendState')));
    }

    section('F2. Review I1 — a rejoiner whose clock runs AHEAD of the host still gets back in');
    for (const skew of [500, 5000, -500]) {
      const { host, clients, code } = await startMatch('rcgame', ['Ali', 'Bec']);
      const c = clients[0];
      c.net.kill(); advance(50);
      const back = boot("c1'", c.uid, c.phone, skew);
      advance(3000); await flush();
      back.run(`mpRejoinRoom('${code}')`); await flush();
      check(`skew ${skew} ms: back in seat 1`, back.run('mpMyPlayerIdx'), 1);
      ok(`skew ${skew} ms: the snapshot landed`, back.inbox.some(e => e.payload && e.payload.action === 'TEST_STATE'));
      advance(20000); await flush();
      ok(`skew ${skew} ms: no timeout fired afterwards`, !back.shown('mp-rejoin-overlay'));
    }

    section('F4. Review I3 — a rejoiner is back on the room roster');
    {
      const { host, clients, code } = await startMatch('rcgame', ['Ali', 'Bec', 'Cam']);
      const back = reload(clients[0]);
      advance(50);
      back.run(`mpRejoinRoom('${code}')`); await flush();
      const players = () => Object.values(server.read(`rooms/${code}/players`) || {}).map(p => p.uid).sort();
      check('its /players entry is written again', players(), ['u1', 'u2', 'uH'].sort());
      ok('  …and it can remove it on the way out', !!back.run('window.mpClientPlayerRef'));
      host.run('mpReturnToLobby()'); await flush();
      back.run('resetToLobby()'); await flush();
      check('leaving the next lobby takes it off the roster', players(), ['u2', 'uH'].sort());
      check('  …and off the host\'s slots', host.run('mpPlayerSlots.map(p => p.uid)').sort(), ['u2', 'uH'].sort());
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
