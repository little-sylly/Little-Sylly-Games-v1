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
