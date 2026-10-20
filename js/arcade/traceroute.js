// ═══════════════════════════════════════════════════════════════════════════
// traceroute.js — ARCADE CABINET 09. TRACE ROUTE: for once, you're the breach.
// Snake (Nibbles) in Net-Trace's (`nt`) world — route the signal through a
// live Node, grab Data Packets and slip out the Egress before the admin
// finishes hardening the Node around you. Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no gameplay
// harness (registration is checked by tools/verify-arcade.js once it lands).
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep),
// arcade.js (arcExitCabinet)
//  - Prefix `trc`. Screen id: screen-arcade-traceroute. DOM: #trc-stage (pointer
//    target, touch-action:none) wrapping #trc-canvas, plus #btn-trc-exit.
//  - Teardown is wired by the ARC_CABINETS entry's `stop` field (js/lobby/arcade.js), NOT by editing
//    engine.js — resetToLobby() iterates the registry and calls every stop().
//  - NO setTimeouts: every delayed effect is scheduled on trcClock via trcEvents.
//
// HOW IT PLAYS
//  - Swipe to steer. Up to two turns buffer, and one drag can chain both, so a
//    quick double-swipe is a U-bend. A turn that lands within 90 ms of a crash
//    still counts (the kind turn rule).
//  - Collect the Data Packets (+2 trace each), then leave through the Egress.
//    YOUR TRACE CARRIES OVER from Node to Node, so the run closes in on you the
//    way late-game snake does. Grab packets quickly for a PACKET CHAIN.
//  - Each Node brings one new thing, with a boot banner and a coach line the
//    first time it appears: Firewalls (02), Honeypots (03), a patrolling Daemon
//    (04), Exploit chips (05), LOCKDOWN (06), a Hunter Daemon (07). Then
//    everything mixes and speeds up.
//  - Exploit chips are the power-ups, all on one clock: ROOTKIT (pass through
//    Firewalls and your own trace; Daemons die on contact), FREEZE (admin,
//    Daemons and the Hardening Window suspended), COMPRESS (trace halved).
//  - Net-Trace's one hard rule holds: the Node can never be sealed. Every
//    Firewall drop is BFS-checked so all free cells stay one network and the
//    packet / Egress stay reachable, and it never lands on or right in front
//    of the trace (or on a Daemon or a chip).
//  - The voice stays in Net-Trace's register: dry system alerts, no
//    exclamation marks, no emoji. The arcade madness is translated, not dropped.
// ═══════════════════════════════════════════════════════════════════════════
const TRC_W = 360, TRC_H = 640;
const TRC_TITLE = 'TRACE ROUTE';
const TRC_TOP_N = 5;

// Palette — Net-Trace's emerald on slate (replaces the house CRT green)
const TRC_BG      = '#0F172A',  // slate-900
      TRC_GRID    = '#1E293B',  // slate-800 panels
      TRC_DOT     = '#334155',  // slate-700 grid dots
      TRC_DIM     = '#64748B',  // slate-500 labels
      TRC_SOFT    = '#94A3B8',  // slate-400 secondary copy
      TRC_EMERALD = '#10B981',  // emerald-500, brand
      TRC_EM_DK   = '#059669',  // emerald-600, Firewall Segments
      TRC_EM_HI   = '#34D399',  // emerald-400, the trace
      TRC_HEAD    = '#E2E8F0',  // the signal head: white-hot
      TRC_VIOLET  = '#8B5CF6',  // native/system components: Honeypots
      TRC_SECTOR  = '#475569',  // Bad Sectors (hatched)
      TRC_PACKET  = '#FDE68A',  // Data Packets
      TRC_RED     = '#F87171',  // terminated / warnings / patrol Daemons
      TRC_ROSE    = '#FB7185',  // Hunter Daemons
      TRC_CYAN    = '#22D3EE';  // Exploits — the breach's own tools
const TRC_RAMP_OK   = [[52, 211, 153], [5, 150, 105]];   // trace head → tail
const TRC_RAMP_RED  = [[248, 113, 113], [127, 29, 29]];  // a locked-out trace
const TRC_RAMP_ROOT = [[103, 232, 249], [14, 116, 144]]; // ROOTKIT active

// The Node: 18 × 24 cells of 20 px, a 360 × 480 field at y = 96–576
const TRC_COLS = 18, TRC_ROWS = 24, TRC_CELL = 20, TRC_FY = 96;
const TRC_N = TRC_COLS * TRC_ROWS;
const TRC_DX = [0, 1, 0, -1], TRC_DY = [-1, 0, 1, 0];   // up, right, down, left

const TRC_RETRIES  = 3;
const TRC_SWIPE    = 24;     // logical px for a swipe to register
const TRC_GRACE_MS = 90;     // kind turn rule
const TRC_WARN_MS  = 1200;   // Firewall flicker before it goes solid
const TRC_BOOT_MS = 1200, TRC_BOOT_INTRO_MS = 2200, TRC_BREACH_MS = 2900, TRC_TERM_MS = 1300, TRC_SKIP_MS = 1100;
const TRC_START_LEN = 4, TRC_CARRY_MAX = 44;   // the trace carries over, up to this long
const TRC_CHAIN_MS = 5000;   // packets this close together build a PACKET CHAIN
const TRC_CHIP_LIFE = 9, TRC_EXPLOIT_S = 5;
const TRC_LOCK_AT = 14;      // LOCKDOWN starts with this many seconds left
const TRC_HEX = '6D617A65';  // unexplained, as in Net-Trace
const TRC_BOOT_LOG = [
  'BOOTING AMAZE INC. OS v1.2…',
  'INITIALISING OS…',
  'CONNECTING TO CLUSTER…',
  'ROUTING VIA PENDER SECURITIES…',
  'SECURING INGRESS…',
];
const TRC_ROLE = '> ROLE REVERSED. YOU ARE THE BREACH.';
const TRC_CPS = 110;         // boot-log typing speed, chars per second

// Each Node's identity: its boot subtitle and the one new thing it brings
const TRC_NODES = [
  { sub: 'HANDSHAKE',         intro: null },
  { sub: 'ADMIN ONLINE',      intro: 'firewall' },
  { sub: 'HONEYPOT ARMED',    intro: 'honeypot' },
  { sub: 'DAEMON SPAWNED',    intro: 'daemon' },
  { sub: 'EXPLOIT KIT',       intro: 'exploit' },
  { sub: 'LOCKDOWN PROTOCOL', intro: 'lockdown' },
  { sub: 'HUNTER PROCESS',    intro: 'hunter' },
];
const TRC_SUB_MORE = ['PENETRATION TEST', 'ZERO TRUST', 'FULL AUDIT', 'INCIDENT RESPONSE', 'BLACK ICE', 'TOTAL LOCKDOWN'];
const TRC_INTRO = {
  firewall: { label: 'FIREWALL SEGMENTS', col: TRC_EM_HI },
  honeypot: { label: 'HONEYPOTS',         col: TRC_VIOLET },
  daemon:   { label: 'PATROL DAEMON',     col: TRC_RED },
  exploit:  { label: 'EXPLOIT CHIPS',     col: TRC_CYAN },
  lockdown: { label: 'LOCKDOWN',          col: TRC_RED },
  hunter:   { label: 'HUNTER DAEMON',     col: TRC_ROSE },
};
// Teach in play: one coach line the first time each thing appears, once per session
const TRC_COACH = {
  swipe:    'Swipe to route the signal. Collect the packets, then leave through the Egress.',
  carry:    'Your trace carries into the next Node. It only gets longer.',
  firewall: 'Red flicker: a Firewall is incoming. It never lands right in front of you.',
  honeypot: 'Honeypots halve your speed. The Hardening Window keeps counting.',
  daemon:   'Patrol Daemon. Head contact terminates the trace. Your trail deflects it.',
  exploit:  'Exploit chip detected. Route through it to execute.',
  rootkit:  'ROOTKIT: pass through Firewalls and your own trace. Daemons are deleted on contact.',
  freeze:   'FREEZE: the admin, the Daemons and the window are suspended.',
  compress: 'COMPRESS: trace length halved.',
  lockdown: 'LOCKDOWN: the admin hardens twice as fast until the window closes.',
  hunter:   'Hunter Daemon. It follows the signal. Wall it off with your trace.',
};
const TRC_EXPLOITS = {
  rootkit:  { tag: 'RK', name: 'ROOTKIT',  shout: 'ROOTKIT EXECUTED' },
  freeze:   { tag: 'FZ', name: 'FREEZE',   shout: 'ADMIN SUSPENDED' },
  compress: { tag: 'GZ', name: 'COMPRESS', shout: 'TRACE COMPRESSED' },
};
const TRC_WHY = { edge: 'NODE BOUNDARY', sector: 'BAD SECTOR', firewall: 'FIREWALL COLLISION',
  trace: 'TRACE COLLISION', daemon: 'DAEMON CONTACT' };

const TRC_SOUND = {
  select:    () => playSecretBeep(660),
  highScore: () => playSecretBeep(1046),
  turn:      () => playSecretBeep(440),
  packet:    () => playSecretBeep(988),
  fwLand:    () => playSecretBeep(330),
  tick:      () => playSecretBeep(880),
  close:     () => playSecretBeep(1175),
};
const TRC_JINGLE = {
  egressOpen: [523, 659, 784],
  fwWarn:     [1200, 1200],
  honeypot:   [220, 233, 220, 233],
  breached:   [523, 784, 1046, 1318],
  terminated: [147, 110, 82],
  chain:      [988, 1175, 1397],
  chip:       [784, 1046, 1318],
  compress:   [1318, 1046, 784, 523],
  freeze:     [1568, 1318, 1568],
  kill:       [1046, 1318, 1568, 2093],
  lockdown:   [880, 660, 880, 660, 880, 660],
  hunter:     [196, 262, 196],
  intro:      [660, 0, 660],
};
const TRC_OVER_JINGLE = [523, 392, 330, 262];

// Tuning, per Node — tuned with a headless bot (see the hand-off)
function trcTune(n) {
  return {
    speed:     Math.min(10.5, 6 + 0.5 * (n - 1)),
    packets:   n <= 2 ? 4 : n <= 6 ? 5 : 6,
    window:    n === 1 ? 45 : n <= 3 ? 36 : n <= 6 ? 32 : Math.max(26, 32 - (n - 6)),
    fwEvery:   n === 1 ? 0 : [0, 0, 6, 5, 4.5, 4.5, 4, 3.6][n] || Math.max(2.6, 3.6 - 0.2 * (n - 7)),
    fwLen:     n < 6 ? [1, 3] : [2, 4],
    honeypots: n < 3 ? 0 : n < 6 ? 1 : 2,
    sectors:   n === 1 ? 3 : n === 2 ? 4 : n <= 5 ? 5 : 6,
    patrols:   n < 4 ? 0 : n < 8 ? 1 : 2,
    patrolSpd: Math.min(5, 3 + 0.3 * (n - 4)),
    hunters:   n < 7 ? 0 : 1,
    hunterK:   n < 9 ? 0.48 : 0.54,
    chips:     n < 5 ? 0 : n < 8 ? 1 : 2,
    lockdown:  n >= 6,
  };
}
function trcNodeInfo(n) {
  if (n <= TRC_NODES.length) return TRC_NODES[n - 1];
  return { sub: TRC_SUB_MORE[(n - TRC_NODES.length - 1) % TRC_SUB_MORE.length], intro: null };
}

// Layout rects (logical px)
const TRC_BTN_PLAY     = { x: 40,  y: 430, w: 280, h: 64 };
const TRC_SLOTS = [ { x: 60, y: 300, w: 66, h: 84 }, { x: 147, y: 300, w: 66, h: 84 }, { x: 234, y: 300, w: 66, h: 84 } ];
const TRC_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const TRC_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const TRC_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

let trcCanvas = null, trcCtx = null;
let trcRafHandle = null, trcLastT = 0;
let trcState = 'attract';  // attract | playing | over | nameEntry | leaderboard
let trcClock = 0;          // ms of un-paused time
let trcEvents = [];        // [{ at, fn }] — replaces setTimeout
let trcParts = [];
let trcShake = 0, trcFlash = 0, trcHitStop = 0;
let trcScore = 0, trcLastScore = 0, trcDisp = 0;
let trcPtrId = null;       // the one pointer allowed to act
let trcPress = null;       // swipe origin {x, y}
let trcScores = [];        // session leaderboard — NOT cleared by teardown
let trcLastEntry = null;
let trcCoachSeen = {};     // session-only: each coach line shows once — NOT cleared by teardown
const TRC_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let trcInitials = [0, 0, 0];

// The run
let trcNode = 1, trcRetries = TRC_RETRIES, trcBreachedCount = 0, trcAttempt = 0;
let trcCarry = TRC_START_LEN, trcMaxLen = TRC_START_LEN, trcKills = 0;
let trcT = trcTune(1), trcLayout = null, trcInfo = trcNodeInfo(1);
// The current attempt at a Node
let trcGrid = new Uint8Array(TRC_N);   // 0 free · 1 Bad Sector · 2 Firewall Segment
let trcLanded = new Float64Array(TRC_N);
let trcWarns = [];                     // [{ cells: [i], at }] — flickering Firewalls
let trcBody = [], trcDir = 1, trcGrow = 0, trcQueue = [], trcAcc = 0, trcGrace = 0, trcWhy = '';
let trcPacket = -1, trcPacketT = 0, trcGot = 0, trcEgress = -1, trcEgressT = 0;
let trcTimeLeft = 0, trcLastTick = 0, trcFwTimer = 0, trcTraceT = 0;
let trcInHoney = false, trcTouched = false;
let trcRoute = [], trcGhosts = [];
let trcDaemons = [];                   // [{ kind, i, prev, dir, acc, speed, wake, near, trail }]
let trcChips = [], trcChipPlan = [];   // chips on the field / when the next ones spawn
let trcActive = null;                  // the running exploit { kind, until, ext }
let trcLock = false, trcChain = 0, trcChainT = -1e9, trcLastClose = -1e9;
let trcPhase = 'boot', trcPhaseT = 0, trcBootMs = TRC_BOOT_MS;
let trcFail = '', trcFailWhy = '', trcFinal = false, trcGlitchUntil = 0;
let trcBonus = { secs: 0, window: 0, clean: false, latency: 0, hops: 0, len: 0 };
let trcShout = null;                   // the announcer — one system alert at a time
let trcCoach = null, trcCoachQ = [];
// Attract
let trcAttractT = 0, trcDemo = null;

// ── Small helpers ──────────────────────────────────────────────────────────
function trcRand(n) { return (Math.random() * n) | 0; }
function trcPick(a) { return a[trcRand(a.length)]; }
function trcCol(i) { return i % TRC_COLS; }
function trcRow(i) { return (i / TRC_COLS) | 0; }
function trcCX(i) { return trcCol(i) * TRC_CELL + TRC_CELL / 2; }
function trcCY(i) { return TRC_FY + trcRow(i) * TRC_CELL + TRC_CELL / 2; }
function trcNext(i, d) {
  const c = trcCol(i) + TRC_DX[d], r = trcRow(i) + TRC_DY[d];
  return (c < 0 || r < 0 || c >= TRC_COLS || r >= TRC_ROWS) ? -1 : r * TRC_COLS + c;
}
function trcMan(a, b) { return Math.abs(trcCol(a) - trcCol(b)) + Math.abs(trcRow(a) - trcRow(b)); }
function trcIsEdge(i) { const c = trcCol(i), r = trcRow(i); return c === 0 || r === 0 || c === TRC_COLS - 1 || r === TRC_ROWS - 1; }
function trcFmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function trcPad(n) { return String(n).padStart(2, '0'); }
function trcMix(ramp, t) {
  const a = ramp[0], b = ramp[1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}
function trcJingle(freqs, gap = 90) {
  freqs.forEach((f, k) => { if (f) trcEvents.push({ at: trcClock + k * gap, fn: () => playSecretBeep(f) }); });
}
function trcWarnAt(i) { return trcWarns.some(w => w.cells.includes(i)); }
function trcDaemonAt(i) { return trcDaemons.find(d => !d.dead && d.i === i); }
function trcChipAt(i) { return trcChips.find(c => c.i === i); }
function trcHoneyAt(i, honey) {
  const c = trcCol(i), r = trcRow(i);
  return honey.some(h => (c - h.c) * (c - h.c) + (r - h.r) * (r - h.r) <= 2.25);
}
function trcLen() { return trcBody.length + trcGrow; }
function trcRooted() { return !!trcActive && trcActive.kind === 'rootkit'; }
function trcFrozen() { return !!trcActive && trcActive.kind === 'freeze'; }

// ── Reachability (BFS) — Net-Trace's "never seal the Egress" rule ──────────
const trcQ = new Int16Array(TRC_N), trcSeen = new Uint8Array(TRC_N);
// Floods from `start` over cells where blocked[i] is 0. Returns cells reached,
// or -2 the moment `target` is reached. Leaves the reached set in trcSeen.
function trcFlood(blocked, start, target) {
  trcSeen.fill(0);
  if (start < 0 || blocked[start]) return 0;
  let h = 0, t = 0, n = 0;
  trcQ[t++] = start; trcSeen[start] = 1;
  while (h < t) {
    const i = trcQ[h++]; n++;
    if (i === target) return -2;
    const c = i % TRC_COLS;
    if (c > 0)                 { const j = i - 1;        if (!blocked[j] && !trcSeen[j]) { trcSeen[j] = 1; trcQ[t++] = j; } }
    if (c < TRC_COLS - 1)      { const j = i + 1;        if (!blocked[j] && !trcSeen[j]) { trcSeen[j] = 1; trcQ[t++] = j; } }
    if (i >= TRC_COLS)         { const j = i - TRC_COLS; if (!blocked[j] && !trcSeen[j]) { trcSeen[j] = 1; trcQ[t++] = j; } }
    if (i < TRC_N - TRC_COLS)  { const j = i + TRC_COLS; if (!blocked[j] && !trcSeen[j]) { trcSeen[j] = 1; trcQ[t++] = j; } }
  }
  return n;
}
// Every free cell is reachable from `start` — the Node is one network.
function trcAllConnected(blocked, start) {
  let free = 0;
  for (let i = 0; i < TRC_N; i++) if (!blocked[i]) free++;
  return trcFlood(blocked, start, -1) === free;
}
// Can the head reach `target` right now, treating its own trail as solid?
function trcReachable(blocked, start, target) {
  const b = blocked.slice();
  for (let k = 1; k < trcBody.length; k++) b[trcBody[k]] = 1;
  b[start] = 0;
  return trcFlood(b, start, target) === -2;
}
function trcBlockedNow() {
  const b = new Uint8Array(TRC_N);
  for (let i = 0; i < TRC_N; i++) if (trcGrid[i]) b[i] = 1;
  trcWarns.forEach(w => w.cells.forEach(i => { b[i] = 1; }));
  return b;
}
// BFS distances from `start` over free cells, the trail (minus the head) solid
const trcDist = new Int16Array(TRC_N);
function trcDistMap(start) {
  trcDist.fill(-1);
  const b = new Uint8Array(TRC_N);
  for (let i = 0; i < TRC_N; i++) if (trcGrid[i]) b[i] = 1;
  for (let k = 1; k < trcBody.length; k++) b[trcBody[k]] = 1;
  let h = 0, t = 0;
  trcQ[t++] = start; trcDist[start] = 0;
  while (h < t) {
    const i = trcQ[h++];
    for (let d = 0; d < 4; d++) {
      const j = trcNext(i, d);
      if (j < 0 || b[j] || trcDist[j] >= 0) continue;
      trcDist[j] = trcDist[i] + 1; trcQ[t++] = j;
    }
  }
}
// A free cell the head can reach, inside a Manhattan band — for spawns
function trcSpawnCell(minD, maxD, avoidEdge) {
  const head = trcBody[0];
  const b = trcBlockedNow();
  for (let k = 1; k < trcBody.length; k++) b[trcBody[k]] = 1;
  trcFlood(b, head, -1);
  const good = [], ok = [];
  for (let i = 0; i < TRC_N; i++) {
    if (!trcSeen[i] || i === head || trcGrid[i] || trcWarnAt(i) || i === trcEgress || i === trcPacket) continue;
    if (trcChipAt(i) || trcDaemonAt(i)) continue;
    ok.push(i);
    const m = trcMan(i, head);
    if ((avoidEdge && trcIsEdge(i)) || m < minD || m > maxD) continue;
    good.push(i);
  }
  const pool = good.length ? good : ok;
  return pool.length ? trcPick(pool) : -1;
}

// ── Node generation ────────────────────────────────────────────────────────
function trcGenLayout(n) {
  const t = trcTune(n);
  for (let tries = 0; tries < 80; tries++) {
    const ingress = 4 + trcRand(TRC_ROWS - 8);
    const ing = ingress * TRC_COLS;
    const guard = i => trcCol(i) <= 5 && Math.abs(trcRow(i) - ingress) <= 2;   // keep the doorway clear
    const s = new Uint8Array(TRC_N);
    let ok = true;
    for (let k = 0; k < t.sectors && ok; k++) {
      let seed = -1;
      for (let a = 0; a < 40; a++) { const i = trcRand(TRC_N); if (!s[i] && !guard(i)) { seed = i; break; } }
      if (seed < 0) { ok = false; break; }
      const size = 2 + trcRand(4), cl = [seed];
      s[seed] = 1;
      for (let a = 0; cl.length < size && a < 40; a++) {
        const j = trcNext(cl[trcRand(cl.length)], trcRand(4));
        if (j >= 0 && !s[j] && !guard(j)) { s[j] = 1; cl.push(j); }
      }
    }
    if (!ok || !trcAllConnected(s, ing)) continue;
    const honey = [];
    for (let k = 0; k < t.honeypots; k++) {
      for (let a = 0; a < 80; a++) {
        const c = 2 + trcRand(TRC_COLS - 4), r = 2 + trcRand(TRC_ROWS - 4);
        if (s[r * TRC_COLS + c]) continue;
        if (c <= 6 && Math.abs(r - ingress) <= 3) continue;
        if (honey.some(h => Math.abs(h.c - c) + Math.abs(h.r - r) < 8)) continue;
        honey.push({ c, r }); break;
      }
    }
    return { sectors: s, ingress, honey };
  }
  return { sectors: new Uint8Array(TRC_N), ingress: 12, honey: [] };
}

// A patrol Daemon sweeps a straight lane of at least 7 free cells, away from the Ingress
function trcSpawnPatrol() {
  const ing = trcLayout.ingress * TRC_COLS;
  for (let a = 0; a < 120; a++) {
    const i = trcRand(TRC_N);
    if (trcGrid[i] || trcCol(i) < 6 || trcMan(i, ing) < 8 || trcDaemonAt(i) || i === trcPacket) continue;
    const dir = trcRand(2) ? 1 : 2;   // horizontal or vertical lane
    let run = 1;
    for (const d of [dir, dir + 2]) { let j = trcNext(i, d % 4); while (j >= 0 && !trcGrid[j]) { run++; j = trcNext(j, d % 4); } }
    if (run < 7) continue;
    trcDaemons.push({ kind: 'patrol', i, prev: i, dir: trcRand(2) ? dir : (dir + 2) % 4, acc: 0,
      speed: trcT.patrolSpd, wake: 0, near: false, trail: [], dead: false });
    return;
  }
}
// A Hunter Daemon wakes far from the Ingress, a beat after the Node goes live
function trcSpawnHunter() {
  const ing = trcLayout.ingress * TRC_COLS;
  const far = [];
  for (let i = 0; i < TRC_N; i++) if (!trcGrid[i] && trcMan(i, ing) >= 16 && !trcDaemonAt(i) && i !== trcPacket) far.push(i);
  if (!far.length) return;
  const i = trcPick(far);
  trcDaemons.push({ kind: 'hunter', i, prev: i, dir: 3, acc: 0, speed: 0, wake: 2.5, near: false, trail: [], dead: false });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
function trcStart() {
  trcCanvas = document.getElementById('trc-canvas');
  trcCtx = trcCanvas.getContext('2d');
  showScreen('screen-arcade-traceroute');
  trcResize();
  trcEnterState('attract');
}

function trcEnterState(next) {
  trcState = next;
  if (next === 'playing') trcNewGame();
  if (next === 'attract') { trcAttractT = trcClock; trcDemoInit(); }
  trcShake = 0; trcFlash = 0; trcHitStop = 0; trcPress = null;
  if (!trcRafHandle) { trcLastT = 0; trcRafHandle = requestAnimationFrame(trcLoop); }
}

function trcNewGame() {
  trcScore = 0; trcDisp = 0; trcParts = []; trcEvents = [];
  trcNode = 1; trcRetries = TRC_RETRIES; trcBreachedCount = 0; trcKills = 0;
  trcCarry = TRC_START_LEN; trcMaxLen = TRC_START_LEN;
  trcShout = null; trcCoach = null; trcCoachQ = [];
  trcBuildNode();
  trcStartAttempt();
}

function trcBuildNode() {
  trcT = trcTune(trcNode);
  trcInfo = trcNodeInfo(trcNode);
  trcLayout = trcGenLayout(trcNode);
  trcAttempt = 0;
}

function trcStartAttempt() {
  trcAttempt++;
  trcGrid = trcLayout.sectors.slice();
  trcLanded = new Float64Array(TRC_N);
  trcWarns = [];
  const ing = trcLayout.ingress * TRC_COLS;
  trcBody = [ing]; trcDir = 1; trcGrow = trcCarry - 1; trcQueue = []; trcAcc = 0; trcGrace = 0;
  trcGot = 0; trcEgress = -1; trcPacket = -1;
  trcDaemons = []; trcChips = []; trcActive = null; trcLock = false;
  trcChain = 0; trcChainT = -1e9;
  trcSpawnPacket();
  for (let k = 0; k < trcT.patrols; k++) trcSpawnPatrol();
  for (let k = 0; k < trcT.hunters; k++) trcSpawnHunter();
  trcChipPlan = [];
  for (let k = 0; k < trcT.chips; k++) {
    trcChipPlan.push(k === 0 ? (trcInfo.intro === 'exploit' ? 3.5 : 5 + Math.random() * 6) : 16 + (k - 1) * 9 + Math.random() * 4);
  }
  trcTimeLeft = trcT.window; trcLastTick = Math.ceil(trcTimeLeft); trcFwTimer = 0; trcTraceT = 0;
  trcInHoney = false; trcTouched = false;
  trcRoute = [ing]; trcGhosts = [];
  trcPhase = 'boot'; trcPhaseT = trcClock; trcGlitchUntil = 0;
  trcBootMs = (trcAttempt === 1 && trcInfo.intro) ? TRC_BOOT_INTRO_MS : TRC_BOOT_MS;
  if (trcBootMs === TRC_BOOT_INTRO_MS) trcJingle(TRC_JINGLE.intro, 110);
}

function trcNextNode() {
  trcNode++;
  trcBuildNode();
  trcStartAttempt();
}

function trcLoop(now) {
  trcRafHandle = null;
  if (!trcLastT) trcLastT = now;
  const dt = Math.min((now - trcLastT) / 1000, 0.05);
  trcLastT = now;
  const so = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';
  if (!paused) trcUpdate(dt);
  trcDraw();
  if (!trcRafHandle) trcRafHandle = requestAnimationFrame(trcLoop);
}

function trcUpdate(dt) {
  trcClock += dt * 1000;
  if (trcShake > 0) trcShake = Math.max(0, trcShake - dt);
  if (trcFlash > 0) trcFlash = Math.max(0, trcFlash - dt * 4);
  trcParts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; p.life -= dt; });
  trcParts = trcParts.filter(p => p.life > 0);
  if (trcEvents.length) {
    const due = trcEvents.filter(e => trcClock >= e.at);
    trcEvents = trcEvents.filter(e => trcClock < e.at);
    due.forEach(e => e.fn());
  }
  if (trcGhosts.length) trcGhosts = trcGhosts.filter(g => trcClock - g.at < 300);
  if (trcDisp < trcScore) trcDisp = Math.min(trcScore, trcDisp + Math.max(1, (trcScore - trcDisp) * dt * 5));
  else trcDisp = trcScore;
  if (trcShout) { trcShout.t += dt; if (trcShout.t > trcShout.life) trcShout = null; }
  if (trcCoach) { trcCoach.t += dt; if (trcCoach.t > 5.5) trcCoach = null; }
  if (!trcCoach && trcCoachQ.length && trcState === 'playing' && trcPhase === 'tracing') trcCoach = { text: trcCoachQ.shift(), t: 0 };

  if (trcState === 'attract') trcDemoUpdate(dt);
  else if (trcState === 'playing') {
    if (trcHitStop > 0) { trcHitStop -= dt; return; }   // hit-stop: the Node holds its breath
    trcUpdatePlaying(dt);
  }
}

function trcCoachShow(key) {
  if (trcCoachSeen[key]) return;
  trcCoachSeen[key] = true;
  trcCoachQ.push(TRC_COACH[key]);
}

// The announcer: one system alert at a time; a loud one cuts in
function trcSay(text, col, loud, life = 1.3) {
  if (trcShout && trcShout.loud && !loud && trcShout.t < 0.6) return;
  trcShout = { text, col, loud: !!loud, t: 0, life };
}

function trcUpdatePlaying(dt) {
  const t = trcClock - trcPhaseT;
  if (trcPhase === 'boot') {
    if (t >= trcBootMs) {
      trcPhase = 'tracing'; trcPhaseT = trcClock;
      if (trcNode === 1) trcCoachShow('swipe');
      if (trcNode === 2) trcCoachShow('carry');
      if (trcT.honeypots) trcCoachShow('honeypot');
      if (trcT.patrols) trcCoachShow('daemon');
    }
    return;
  }
  if (trcPhase === 'breached') { if (t >= TRC_BREACH_MS) trcNextNode(); return; }
  if (trcPhase === 'terminated') {
    if (t >= TRC_TERM_MS) { if (trcFinal) trcGameOver(); else trcStartAttempt(); }
    return;
  }
  // tracing
  trcTraceT += dt;
  if (trcActive && trcClock >= trcActive.until) trcEndExploit();
  const frozen = trcFrozen();
  if (!frozen) {
    trcTimeLeft -= dt;
    const whole = Math.ceil(trcTimeLeft);
    if (whole < trcLastTick) { trcLastTick = whole; if (whole > 0 && whole <= 5) TRC_SOUND.tick(); }
    if (trcTimeLeft <= 0) { trcTimeLeft = 0; trcFailNode('timeout', ''); return; }
    if (trcT.lockdown && !trcLock && trcTimeLeft <= TRC_LOCK_AT) {
      trcLock = true; trcFwTimer = trcT.fwEvery;   // first lockdown drop lands at once
      trcSay('LOCKDOWN INITIATED', TRC_RED, true, 1.6);
      trcJingle(TRC_JINGLE.lockdown, 110);
      trcShake = Math.max(trcShake, 0.15);
      trcCoachShow('lockdown');
    }
  } else {
    trcWarns.forEach(w => { w.at += dt * 1000; });   // suspended mid-flicker
  }

  trcSolidify();
  if (trcT.fwEvery > 0 && !frozen) {
    const every = Math.max(1.5, trcT.fwEvery * (trcLock ? 0.5 : 1));
    trcFwTimer += dt;
    if (trcFwTimer >= every) { trcFwTimer -= every; trcAdminDrop(); }
  }

  // Exploit chips
  while (trcChipPlan.length && trcTraceT >= trcChipPlan[0]) {
    trcChipPlan.shift();
    if (trcEgress >= 0 && trcTimeLeft < 4) continue;
    const i = trcSpawnCell(5, 14, true);
    if (i >= 0) {
      trcChips.push({ i, kind: trcPickChip(), born: trcClock, life: TRC_CHIP_LIFE });
      trcCoachShow('exploit');
    }
  }
  trcChips.forEach(c => { c.life -= dt; });
  trcChips = trcChips.filter(c => {
    if (c.life > 0) return true;
    trcBurst(trcCX(c.i), trcCY(c.i), 6, [TRC_CYAN, TRC_DIM], 60, 2);
    return false;
  });

  // Daemons
  if (!frozen) {
    for (const d of trcDaemons) {
      if (d.dead) continue;
      if (d.kind === 'hunter') {
        if (d.wake > 0) {
          d.wake -= dt;
          if (d.wake <= 0) { trcJingle(TRC_JINGLE.hunter, 120); trcSay('HUNTER PROCESS ACTIVE', TRC_ROSE, false); trcCoachShow('hunter'); }
          continue;
        }
        d.speed = trcT.speed * trcT.hunterK * (trcHoneyAt(d.i, trcLayout.honey) ? 0.5 : 1);
      }
      d.acc += dt * d.speed;
      while (d.acc >= 1 && trcPhase === 'tracing') { d.acc -= 1; trcDaemonStep(d); }
      if (trcPhase !== 'tracing') return;
    }
    trcCheckClose();
  }

  if (trcGrace) {   // kind turn rule: a turn landing just after a would-be crash still counts
    while (trcGrace && trcQueue.length) {
      const d = trcQueue.shift();
      if (trcCanGo(d)) { trcGrace = 0; trcTurn(d); trcAcc = 0; trcAdvance(); }
    }
    if (trcGrace && trcClock >= trcGrace) trcFailNode('crash', trcWhy);
    return;
  }
  trcAcc += dt * trcT.speed * (trcInHoney ? 0.5 : 1);
  while (trcAcc >= 1 && trcPhase === 'tracing' && !trcGrace) { trcAcc -= 1; trcStep(); }
}

// ── The trace ──────────────────────────────────────────────────────────────
function trcQueueTurn(d) {
  if (trcState !== 'playing' || (trcPhase !== 'tracing' && trcPhase !== 'boot')) return;
  const last = trcQueue.length ? trcQueue[trcQueue.length - 1] : trcDir;
  if (d === last || d === (last + 2) % 4 || trcQueue.length >= 2) return;
  trcQueue.push(d);
}

function trcTurn(d) { if (d !== trcDir) { trcDir = d; TRC_SOUND.turn(); } }

function trcCanGo(d) {
  const j = trcNext(trcBody[0], d);
  if (j < 0) { trcWhy = 'edge'; return false; }
  const root = trcRooted();
  if (trcGrid[j] === 1) { trcWhy = 'sector'; return false; }
  if (trcGrid[j] === 2 && !root) { trcWhy = 'firewall'; return false; }
  if (root) return true;
  if (trcDaemonAt(j)) { trcWhy = 'daemon'; return false; }
  const last = trcBody.length - 1;
  for (let k = 0; k <= last; k++) {
    if (trcBody[k] === j) {
      if (k === last && trcGrow === 0 && last > 0) return true;
      trcWhy = 'trace'; return false;
    }
  }
  return true;
}

function trcStep() {
  if (trcQueue.length) trcTurn(trcQueue.shift());
  if (!trcCanGo(trcDir)) { trcGrace = trcClock + TRC_GRACE_MS; trcAcc = 0; return; }
  trcAdvance();
}

function trcAdvance() {
  const j = trcNext(trcBody[0], trcDir);
  trcBody.unshift(j);
  if (trcGrow > 0) trcGrow--;
  else trcGhosts.push({ i: trcBody.pop(), at: trcClock });
  trcMaxLen = Math.max(trcMaxLen, trcLen());
  trcRoute.push(j);
  const inH = trcHoneyAt(j, trcLayout.honey);
  if (inH && !trcInHoney) { trcTouched = true; trcJingle(TRC_JINGLE.honeypot, 80); }
  trcInHoney = inH;
  const dm = trcDaemonAt(j);
  if (dm) { trcContact(dm); if (trcPhase !== 'tracing') return; }
  if (j === trcEgress) { trcBreach(); return; }
  if (j === trcPacket) trcCollect();
  const chip = trcChipAt(j);
  if (chip) trcRunChip(chip);
}

function trcCollect() {
  trcChain = (trcClock - trcChainT <= TRC_CHAIN_MS) ? trcChain + 1 : 1;
  trcChainT = trcClock;
  const kb = Math.round(64 * trcNode * (1 + 0.25 * Math.min(trcChain - 1, 4)));
  trcScore += kb; trcGrow += 2; trcGot++;
  const x = trcCX(trcPacket), y = trcCY(trcPacket);
  trcBurst(x, y, 6 + 2 * Math.min(trcChain, 4), [TRC_PACKET, '#FEF3C7'], 110, 3);
  trcParts.push({ x, y: y - 8, vx: 0, vy: -38, life: 0.8, max: 0.8, col: TRC_PACKET, text: `+${kb} KB` });
  if (trcChain >= 3) { trcSay(`PACKET CHAIN ×${trcChain}`, TRC_PACKET, false); trcJingle(TRC_JINGLE.chain, 70); }
  else TRC_SOUND.packet();
  if (trcGot >= trcT.packets) { trcPacket = -1; trcOpenEgress(); }
  else trcSpawnPacket();
}

function trcSpawnPacket() {
  trcPacket = trcSpawnCell(6, 99, true);
  trcPacketT = trcClock;
  if (trcPacket < 0 && trcGot < trcT.packets) { trcGot = trcT.packets; trcOpenEgress(); }
}

function trcOpenEgress() {
  const head = trcBody[0], hc = trcCol(head), hr = trcRow(head);
  const b = trcBlockedNow();
  for (let k = 1; k < trcBody.length; k++) b[trcBody[k]] = 1;
  trcFlood(b, head, -1);
  const ing = trcLayout.ingress;
  const far = [], near = [], any = [];
  for (let i = 0; i < TRC_N; i++) {
    if (!trcIsEdge(i) || trcGrid[i] || trcWarnAt(i) || trcBody.includes(i) || trcChipAt(i)) continue;
    if (trcCol(i) === 0 && Math.abs(trcRow(i) - ing) <= 2) continue;   // not back out the way you came
    any.push(i);
    if (!trcSeen[i]) continue;
    (Math.abs(trcCol(i) - hc) + Math.abs(trcRow(i) - hr) >= 10 ? far : near).push(i);
  }
  const pool = far.length ? far : near.length ? near : any;
  trcEgress = pool[trcRand(pool.length)];
  trcEgressT = trcClock;
  trcJingle(TRC_JINGLE.egressOpen);
  trcSay('EGRESS OPEN', TRC_EM_HI, false, 1.1);
}

function trcBreach() {
  trcPhase = 'breached'; trcPhaseT = trcClock;
  trcQueue = []; trcWarns = []; trcActive = null; trcChips = [];
  const secs = Math.floor(trcTimeLeft);
  trcCarry = Math.min(TRC_CARRY_MAX, trcLen());
  trcBonus = { secs, window: 16 * secs, clean: !trcTouched, latency: trcT.window - trcTimeLeft,
    hops: trcRoute.length - 1, len: trcCarry };
  trcScore += trcBonus.window + (trcBonus.clean ? 128 : 0);
  trcBreachedCount++;
  trcBurst(trcCX(trcEgress), trcCY(trcEgress), 16, [TRC_EM_HI, TRC_HEAD, TRC_EMERALD], 160, 3);
  trcJingle(TRC_JINGLE.breached);
  if (trcBonus.clean) trcEvents.push({ at: trcClock + 1400, fn: () => playSecretBeep(1568) });
  if (secs < 3) trcSay(`BREACH AT T-0:0${secs}`, TRC_PACKET, true, 1.4);
  else trcShout = null;
}

function trcFailNode(kind, why) {
  trcPhase = 'terminated'; trcPhaseT = trcClock; trcFail = kind; trcFailWhy = why;
  trcGrace = 0; trcQueue = []; trcActive = null; trcShout = null;
  trcFinal = trcRetries === 0;
  if (!trcFinal) trcRetries--;
  trcGlitchUntil = trcClock + 150;
  if (kind === 'crash') {
    trcShake = 0.3;
    trcBody.forEach((i, k) => {
      if (k > 60 && k % 2) return;
      const x = trcCX(i), y = trcCY(i);
      for (let n = 0; n < 2; n++) {
        trcParts.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260 - 40, grav: 260,
          life: 0.6 + Math.random() * 0.5, max: 1.1, size: 3 + trcRand(3),
          col: k === 0 ? TRC_HEAD : (Math.random() < 0.5 ? TRC_RED : TRC_EM_HI) });
      }
    });
  }
  trcJingle(TRC_JINGLE.terminated, 120);
}

// ── Daemons ────────────────────────────────────────────────────────────────
function trcDaemonBlocked(j, self) {
  if (j < 0 || trcGrid[j]) return true;
  for (let k = 1; k < trcBody.length; k++) if (trcBody[k] === j) return true;   // the trail deflects it
  return trcDaemons.some(d => d !== self && !d.dead && d.i === j);
}

function trcDaemonStep(d) {
  d.prev = d.i;
  if (d.kind === 'patrol') {
    let j = trcNext(d.i, d.dir);
    if (trcDaemonBlocked(j, d)) {
      d.dir = (d.dir + 2) % 4;
      j = trcNext(d.i, d.dir);
      if (trcDaemonBlocked(j, d)) return;
    }
    d.i = j;
  } else {
    // the Hunter takes the shortest free route to the head; walled off, it wanders
    trcDistMap(trcBody[0]);
    const here = trcDist[d.i];
    let best = -1, bestD = 1e9;
    const dirs = [d.dir, (d.dir + 1) % 4, (d.dir + 3) % 4, (d.dir + 2) % 4];
    for (const k of dirs) {
      const j = trcNext(d.i, k);
      if (j !== trcBody[0] && trcDaemonBlocked(j, d)) continue;
      const dj = trcDist[j];
      if (here >= 0 && dj >= 0 && dj < here && dj < bestD) { best = k; bestD = dj; }
    }
    if (best < 0) {
      const open = dirs.filter(k => { const j = trcNext(d.i, k); return j === trcBody[0] || !trcDaemonBlocked(j, d); });
      if (!open.length) return;
      best = (open.includes(d.dir) && Math.random() < 0.7) ? d.dir : trcPick(open);
    }
    d.dir = best;
    d.i = trcNext(d.i, best);
    d.trail.unshift(d.prev); if (d.trail.length > 3) d.trail.pop();
  }
  if (d.i === trcBody[0]) trcContact(d);
}

function trcContact(d) {
  if (trcRooted()) {
    d.dead = true; trcKills++;
    const kb = 128 * trcNode;
    trcScore += kb;
    const x = trcCX(d.i), y = trcCY(d.i);
    trcBurst(x, y, 18, [d.kind === 'hunter' ? TRC_ROSE : TRC_RED, TRC_CYAN, TRC_HEAD], 180, 3);
    trcParts.push({ x, y: y - 10, vx: 0, vy: -40, life: 0.9, max: 0.9, col: TRC_CYAN, text: `+${kb} KB` });
    trcSay('DAEMON TERMINATED', TRC_CYAN, true, 1.4);
    trcJingle(TRC_JINGLE.kill, 70);
    trcHitStop = 0.09; trcFlash = 0.55; trcShake = Math.max(trcShake, 0.18);
    return;
  }
  trcFailNode('crash', 'daemon');
}

// A Daemon brushes past and the trace survives it
function trcCheckClose() {
  const head = trcBody[0];
  for (const d of trcDaemons) {
    if (d.dead || (d.kind === 'hunter' && d.wake > 0)) continue;
    const m = trcMan(d.i, head);
    if (m === 1) d.near = true;
    else if (m >= 3 && d.near) {
      d.near = false;
      if (trcClock - trcLastClose > 3000) {
        trcLastClose = trcClock;
        const kb = 32 * trcNode;
        trcScore += kb;
        trcSay('CLOSE CALL', TRC_EM_HI, false, 1.0);
        trcParts.push({ x: trcCX(head), y: trcCY(head) - 12, vx: 0, vy: -36, life: 0.8, max: 0.8, col: TRC_EM_HI, text: `+${kb} KB` });
        TRC_SOUND.close();
      }
    }
  }
}

// ── Exploits ───────────────────────────────────────────────────────────────
function trcPickChip() {
  const opts = ['rootkit', 'freeze'];
  if (trcLen() >= 16) opts.push('compress', 'compress');
  if (trcDaemons.some(d => !d.dead)) opts.push('rootkit');
  return trcPick(opts);
}

function trcRunChip(c) {
  trcChips = trcChips.filter(x => x !== c);
  trcScore += 64;
  const x = trcCX(c.i), y = trcCY(c.i), ex = TRC_EXPLOITS[c.kind];
  trcBurst(x, y, 14, [TRC_CYAN, TRC_HEAD], 150, 3);
  trcFlash = 0.35;
  trcSay(ex.shout, TRC_CYAN, true, 1.4);
  trcCoachShow(c.kind);
  if (c.kind === 'compress') {
    const len = trcLen(), keep = Math.max(TRC_START_LEN, Math.ceil(len / 2));
    trcGrow = 0;
    while (trcBody.length > keep) {
      const i = trcBody.pop();
      trcParts.push({ x: trcCX(i), y: trcCY(i), vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 50,
        life: 0.6, max: 0.6, size: 4, col: Math.random() < 0.5 ? TRC_CYAN : TRC_EM_HI });
    }
    trcSay(`TRACE COMPRESSED −${len - trcBody.length}`, TRC_CYAN, true, 1.4);
    trcJingle(TRC_JINGLE.compress, 70);
    return;
  }
  trcActive = { kind: c.kind, until: trcClock + TRC_EXPLOIT_S * 1000, ext: 0 };
  trcJingle(c.kind === 'freeze' ? TRC_JINGLE.freeze : TRC_JINGLE.chip, 80);
}

function trcEndExploit() {
  if (trcRooted() && trcGrid[trcBody[0]] === 2) {
    // never drop out of ROOTKIT inside a Firewall: hold it a moment, then dissolve that cell
    if (trcActive.ext < 2000) { trcActive.ext += 250; trcActive.until += 250; return; }
    trcGrid[trcBody[0]] = 0;
  }
  trcActive = null;
  playSecretBeep(523);
}

// ── The admin hardens the Node around you ─────────────────────────────────
function trcDropOk(i, hc, hr) {
  if (trcGrid[i] || i === trcPacket || i === trcEgress) return false;
  if (i === trcLayout.ingress * TRC_COLS) return false;
  if (trcBody.includes(i) || trcWarnAt(i) || trcChipAt(i)) return false;
  if (trcDaemons.some(d => !d.dead && trcMan(d.i, i) <= 1)) return false;
  const dc = trcCol(i) - hc, dr = trcRow(i) - hr;
  if (Math.abs(dc) + Math.abs(dr) <= 2) return false;
  // never within 4 cells ahead of the head — on its heading, or a turn it has queued
  const dirs = [trcDir].concat(trcQueue);
  for (const d of dirs) {
    const along = dc * TRC_DX[d] + dr * TRC_DY[d];
    const perp = Math.abs(dc * TRC_DY[d] - dr * TRC_DX[d]);
    if (along >= 1 && along <= 5 && perp <= 1) return false;
  }
  return true;
}

function trcAdminDrop() {
  const head = trcBody[0], hc = trcCol(head), hr = trcRow(head);
  const base = trcBlockedNow();
  const target = trcEgress >= 0 ? trcEgress : trcPacket;
  const baseReach = target >= 0 && trcReachable(base, head, target);
  const [lo, hi] = trcT.fwLen;
  for (let tries = 0; tries < 60; tries++) {
    const len = lo + trcRand(hi - lo + 1) - (tries > 30 ? 1 : 0);
    if (len < 1) continue;
    const horiz = Math.random() < 0.5;
    const c0 = trcRand(TRC_COLS - (horiz ? len - 1 : 0)), r0 = trcRand(TRC_ROWS - (horiz ? 0 : len - 1));
    const cells = [];
    let ok = true;
    for (let k = 0; k < len; k++) {
      const i = (r0 + (horiz ? 0 : k)) * TRC_COLS + c0 + (horiz ? k : 0);
      if (!trcDropOk(i, hc, hr)) { ok = false; break; }
      cells.push(i);
    }
    if (!ok) continue;
    const b = base.slice();
    cells.forEach(i => { b[i] = 1; });
    if (!trcAllConnected(b, head)) continue;                       // never seal anything
    if (baseReach && !trcReachable(b, head, target)) continue;    // never cut you off from it
    trcWarns.push({ cells, at: trcClock + TRC_WARN_MS });
    trcJingle(TRC_JINGLE.fwWarn, 200);
    if (trcNode >= 2) trcCoachShow('firewall');
    return true;
  }
  return false;   // nowhere fair to drop — the admin skips this beat
}

function trcSolidify() {
  if (!trcWarns.length) return;
  const due = trcWarns.filter(w => trcClock >= w.at);
  if (!due.length) return;
  trcWarns = trcWarns.filter(w => trcClock < w.at);
  // the next two cells on the heading and on any queued turn stay clear —
  // the trace may have moved and turned during the flicker
  const ahead = [];
  [trcDir].concat(trcQueue).forEach(d => {
    const a = trcNext(trcBody[0], d);
    if (a >= 0) { ahead.push(a); const b = trcNext(a, d); if (b >= 0) ahead.push(b); }
  });
  let landed = false;
  due.forEach(w => w.cells.forEach(i => {
    if (ahead.includes(i) || trcBody.includes(i) || trcDaemonAt(i) || trcChipAt(i)) return;   // never on you, or in your face
    trcGrid[i] = 2; trcLanded[i] = trcClock; landed = true;
  }));
  if (landed) { TRC_SOUND.fwLand(); trcShake = Math.max(trcShake, 0.06); }
}

// ── Game over & high scores ────────────────────────────────────────────────
function trcGameOver() {
  trcLastScore = trcScore;
  trcDisp = trcScore;
  trcState = 'over';
  trcCoach = null; trcCoachQ = [];
  TRC_OVER_JINGLE.forEach((f, k) => trcEvents.push({ at: trcClock + 300 + k * 140, fn: () => playSecretBeep(f) }));
  trcEvents.push({ at: trcClock + 1900, fn: () => {
    if (trcQualifies(trcLastScore)) { trcInitials = [0, 0, 0]; TRC_SOUND.highScore(); trcEnterState('nameEntry'); }
    else { trcLastEntry = null; trcEnterState('leaderboard'); }
  }});
}

function trcQualifies(s) { return s > 0 && (trcScores.length < TRC_TOP_N || s > trcScores[trcScores.length - 1].score); }
function trcSubmit(name, score) {
  trcLastEntry = { name, score };
  trcScores.push(trcLastEntry);
  trcScores.sort((a, b) => b.score - a.score);
  trcScores = trcScores.slice(0, TRC_TOP_N);
}

// ── Attract: a demo trace snakes round a dim Node on its own ───────────────
function trcDemoInit() {
  const L = trcGenLayout(3);
  trcDemo = { grid: L.sectors, honey: L.honey, ingress: L.ingress, body: [L.ingress * TRC_COLS], dir: 1, grow: 13, acc: 0 };
}
function trcDemoFree(d, k) {
  const c = trcCol(d.body[0]) + TRC_DX[k], r = trcRow(d.body[0]) + TRC_DY[k];
  if (c < 0 || r < 0 || c >= TRC_COLS || r >= TRC_ROWS) return -1;
  const j = r * TRC_COLS + c;
  if (d.grid[j]) return -1;
  const last = d.body.length - 1;
  for (let n = 0; n < last; n++) if (d.body[n] === j) return -1;
  if (d.body[last] === j && d.grow > 0) return -1;
  return j;
}
function trcDemoUpdate(dt) {
  const d = trcDemo;
  if (!d) return;
  d.acc += dt * 7;
  while (d.acc >= 1) {
    d.acc -= 1;
    const opts = [d.dir, (d.dir + 1) % 4, (d.dir + 3) % 4].filter(k => trcDemoFree(d, k) >= 0);
    if (!opts.length) { d.body = [d.ingress * TRC_COLS]; d.dir = 1; d.grow = 13; continue; }
    // pick the move that leaves the most room, with a liking for going straight
    const b = d.grid.slice();
    d.body.forEach(i => { b[i] = 1; });
    const room = opts.map(k => trcFlood(b, trcDemoFree(d, k), -1));
    const best = Math.max(...room);
    const fine = opts.filter((k, n) => room[n] >= best * 0.8);
    const k = (fine.includes(d.dir) && Math.random() < 0.82) ? d.dir : fine[trcRand(fine.length)];
    d.dir = k;
    d.body.unshift(trcDemoFree(d, k));
    if (d.grow > 0) d.grow--; else d.body.pop();
  }
}
function trcAttractTimes() {
  const logChars = TRC_BOOT_LOG.join('').length;
  const logMs = logChars / TRC_CPS * 1000;
  const titleAt = logMs + 180, roleAt = titleAt + 300;
  const btnAt = roleAt + TRC_ROLE.length / TRC_CPS * 1000 + 150;
  return { logMs, titleAt, roleAt, btnAt };
}
function trcAttractReady() { return trcClock - trcAttractT >= trcAttractTimes().btnAt; }

// ── Drawing ────────────────────────────────────────────────────────────────
function trcText(s, x, y, size, col, align = 'center') {
  const g = trcCtx;
  g.font = `bold ${size}px monospace`; g.fillStyle = col; g.textAlign = align;
  g.fillText(s, x, y);
}
function trcWrap(s, maxW, size) {
  const g = trcCtx;
  g.font = `bold ${size}px monospace`;
  const lines = [];
  let line = '';
  s.split(' ').forEach(w => {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  });
  if (line) lines.push(line);
  return lines;
}
// Text that resolves out of scrambled hex, left to right — the announcer's look
const TRC_HEXCH = '0123456789ABCDEF';
function trcDecrypt(s, t) {
  let out = '';
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    out += (ch === ' ' || t * 1000 >= 30 + k * 11) ? ch : TRC_HEXCH[(k * 7 + Math.floor(trcClock / 45)) % 16];
  }
  return out;
}

function trcDraw() {
  const g = trcCtx;
  g.fillStyle = TRC_BG; g.fillRect(0, 0, TRC_W, TRC_H);
  g.save();
  if (trcShake > 0) g.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  if (trcState === 'playing' && trcClock < trcGlitchUntil) {
    // CONNECTION TERMINATED: the frame tears into three offset slices
    const bands = [0, 205, 430, TRC_H];
    for (let k = 0; k < 3; k++) {
      g.save();
      g.beginPath(); g.rect(0, bands[k], TRC_W, bands[k + 1] - bands[k]); g.clip();
      g.translate((Math.random() - 0.5) * 28, 0);
      trcDrawState();
      g.restore();
    }
    g.fillStyle = 'rgba(248,113,113,0.2)'; g.fillRect(0, 0, TRC_W, TRC_H);
  } else {
    trcDrawState();
  }
  trcDrawParts();
  if (trcState === 'playing') { trcDrawShout(); trcDrawCoach(); }
  if (trcFlash > 0) { g.fillStyle = `rgba(236,254,255,${0.35 * trcFlash})`; g.fillRect(0, 0, TRC_W, TRC_H); }
  g.restore();
}

function trcDrawState() {
  if (trcState === 'attract') trcDrawAttract();
  else if (trcState === 'playing') trcDrawPlay();
  else if (trcState === 'over') trcDrawOver();
  else if (trcState === 'nameEntry') trcDrawNameEntry();
  else if (trcState === 'leaderboard') trcDrawBoard();
}

function trcDrawButton(r, label, size = 22) {
  const g = trcCtx;
  g.fillStyle = 'rgba(15,23,42,0.88)'; g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = TRC_EMERALD; g.lineWidth = 3; g.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
  g.textBaseline = 'middle';
  trcText(label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, TRC_EM_HI);
  g.textBaseline = 'alphabetic';
}

function trcDrawParts() {
  const g = trcCtx;
  trcParts.forEach(p => {
    g.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max || 1)));
    if (p.text) { trcText(p.text, p.x, p.y, 11, p.col); }
    else { const s = p.size || 3; g.fillStyle = p.col; g.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  });
  g.globalAlpha = 1;
}

function trcBurst(x, y, n, cols, speed, size) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.4, v = speed * (0.6 + Math.random() * 0.6);
    trcParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.45 + Math.random() * 0.25, max: 0.7,
      size, col: cols[k % cols.length] });
  }
}

// The Node itself. `f` = { grid, honey, ingress, warns, packet, egress, inHoney }
function trcDrawField(f) {
  const g = trcCtx, C = TRC_CELL, top = TRC_FY;
  // grid dots at cell corners
  g.fillStyle = TRC_DOT;
  for (let r = 0; r <= TRC_ROWS; r++) for (let c = 0; c <= TRC_COLS; c++) g.fillRect(c * C - 0.75, top + r * C - 0.75, 1.5, 1.5);
  g.strokeStyle = 'rgba(16,185,129,0.55)'; g.lineWidth = 1;
  g.strokeRect(0.5, top + 0.5, TRC_W - 1, TRC_ROWS * C - 1);

  // Honeypots — violet, native, a slow rotating dash
  f.honey.forEach(h => {
    const x = h.c * C + C / 2, y = top + h.r * C + C / 2;
    g.beginPath(); g.arc(x, y, 1.5 * C, 0, Math.PI * 2);
    g.fillStyle = f.inHoney ? 'rgba(139,92,246,0.24)' : 'rgba(139,92,246,0.11)'; g.fill();
    g.setLineDash([6, 5]); g.lineDashOffset = -trcClock / 55;
    g.strokeStyle = TRC_VIOLET; g.lineWidth = 2; g.stroke();
    g.setLineDash([]); g.lineDashOffset = 0;
    g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fillStyle = TRC_VIOLET; g.fill();
    g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fillStyle = TRC_BG; g.fill();
  });

  // Bad Sectors — slate blocks, diagonal hatching (one clip, one stroke)
  g.save();
  g.beginPath();
  let any = false;
  for (let i = 0; i < TRC_N; i++) if (f.grid[i] === 1) { g.rect(trcCol(i) * C, top + trcRow(i) * C, C, C); any = true; }
  if (any) {
    g.fillStyle = 'rgba(71,85,105,0.38)'; g.fill();
    g.clip();
    g.beginPath();
    for (let k = -TRC_H; k < TRC_W + TRC_H; k += 6) { g.moveTo(k, top + TRC_ROWS * C); g.lineTo(k + TRC_ROWS * C, top); }
    g.strokeStyle = TRC_SECTOR; g.lineWidth = 1.5; g.stroke();
  }
  g.restore();
  for (let i = 0; i < TRC_N; i++) if (f.grid[i] === 1) {
    g.strokeStyle = 'rgba(100,116,139,0.55)'; g.lineWidth = 1;
    g.strokeRect(trcCol(i) * C + 0.5, top + trcRow(i) * C + 0.5, C - 1, C - 1);
  }

  // Firewall Segments — solid emerald-600, bright top edge, slow scanline
  const scan = (trcClock / 1500) % 1, ghost = f.rooted;
  for (let i = 0; i < TRC_N; i++) if (f.grid[i] === 2) {
    const x = trcCol(i) * C, y = top + trcRow(i) * C;
    g.globalAlpha = ghost ? 0.45 : 1;
    g.fillStyle = TRC_EM_DK; g.fillRect(x + 1, y + 1, C - 2, C - 2);
    g.fillStyle = TRC_EM_HI; g.fillRect(x + 1, y + 1, C - 2, 2);
    g.fillStyle = 'rgba(6,78,59,0.65)'; g.fillRect(x + 1, y + C - 3, C - 2, 2);
    g.fillStyle = 'rgba(209,250,229,0.32)'; g.fillRect(x + 2, y + 3 + scan * (C - 7), C - 4, 1);
    g.globalAlpha = 1;
    const age = trcClock - trcLanded[i];
    if (trcLanded[i] && age < 260) { g.fillStyle = `rgba(236,253,245,${0.7 * (1 - age / 260)})`; g.fillRect(x, y, C, C); }
  }
  // …and the ones still flickering in
  (f.warns || []).forEach(w => {
    const prog = 1 - Math.max(0, w.at - trcClock) / TRC_WARN_MS;
    const on = Math.floor(trcClock / 110) % 2 === 0;
    w.cells.forEach(i => {
      const x = trcCol(i) * C, y = top + trcRow(i) * C;
      g.fillStyle = `rgba(248,113,113,${0.06 + 0.16 * prog})`; g.fillRect(x + 1, y + 1, C - 2, C - 2);
      g.setLineDash([3, 3]); g.strokeStyle = TRC_RED; g.lineWidth = 1.5;
      g.globalAlpha = on ? 1 : 0.35;
      g.strokeRect(x + 2, y + 2, C - 4, C - 4);
      g.globalAlpha = 1; g.setLineDash([]);
    });
  });

  // Ingress — where the signal came in
  trcDrawPort(f.ingress * TRC_COLS, 'rgba(16,185,129,0.7)', 0);

  // Egress
  if (f.egress >= 0) {
    const pulse = 0.5 + 0.5 * Math.sin(trcClock / 170);
    const x = trcCol(f.egress) * C, y = top + trcRow(f.egress) * C;
    g.fillStyle = `rgba(16,185,129,${0.25 + 0.35 * pulse})`; g.fillRect(x + 1, y + 1, C - 2, C - 2);
    g.strokeStyle = TRC_EM_HI; g.lineWidth = 1.5; g.strokeRect(x + 3.5, y + 3.5, C - 7, C - 7);
    trcDrawPort(f.egress, TRC_EM_HI, 1 + 3 * pulse);
    trcDrawEgressLabel(f.egress, pulse);
  }

  // Data Packet — a pulsing yellow diamond
  if (f.packet >= 0) {
    const x = trcCX(f.packet), y = trcCY(f.packet);
    const born = Math.min(1, (trcClock - trcPacketT) / 220);
    const s = (6 + Math.sin(trcClock / 140) * 1.5) * born;
    g.save();
    g.shadowColor = TRC_PACKET; g.shadowBlur = 10;
    g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.closePath();
    g.fillStyle = TRC_PACKET; g.fill();
    g.restore();
  }
}

// Two emerald brackets on the frame either side of a port cell
function trcDrawPort(i, col, o) {
  const g = trcCtx, C = TRC_CELL, c = trcCol(i), r = trcRow(i);
  const x = c * C, y = TRC_FY + r * C;
  g.fillStyle = col;
  if (c === 0 || c === TRC_COLS - 1) {
    const bx = c === 0 ? 0 : TRC_W - 4;
    g.fillRect(bx, y - o - 7, 4, 7); g.fillRect(bx, y + C + o, 4, 7);
  } else {
    const by = r === 0 ? TRC_FY : TRC_FY + TRC_ROWS * C - 4;
    g.fillRect(x - o - 7, by, 7, 4); g.fillRect(x + C + o, by, 7, 4);
  }
}

function trcDrawEgressLabel(i, pulse) {
  const c = trcCol(i), r = trcRow(i);
  const col = `rgba(52,211,153,${0.65 + 0.35 * pulse})`;
  const g = trcCtx;
  g.textBaseline = 'middle';
  if (c === 0) trcText('◀ EGRESS', 26, trcCY(i), 11, col, 'left');
  else if (c === TRC_COLS - 1) trcText('EGRESS ▶', TRC_W - 26, trcCY(i), 11, col, 'right');
  else {
    const x = Math.max(36, Math.min(TRC_W - 36, trcCX(i)));
    if (r === 0) trcText('▲ EGRESS', x, trcCY(i) + 22, 11, col);
    else trcText('EGRESS ▼', x, trcCY(i) - 22, 11, col);
  }
  g.textBaseline = 'alphabetic';
}

// Exploit chips — a cyan microchip with its tag, blinking out as it expires
function trcDrawChip(c) {
  const g = trcCtx, x = trcCX(c.i), y = trcCY(c.i);
  if (c.life < 2 && Math.floor(trcClock / 120) % 2) return;
  const born = Math.min(1, (trcClock - c.born) / 250), s = 7 * born;
  g.save();
  g.shadowColor = TRC_CYAN; g.shadowBlur = 8 + 4 * Math.sin(trcClock / 160);
  g.fillStyle = '#083344'; g.fillRect(x - s, y - s, 2 * s, 2 * s);
  g.strokeStyle = TRC_CYAN; g.lineWidth = 1.5; g.strokeRect(x - s + 0.5, y - s + 0.5, 2 * s - 1, 2 * s - 1);
  g.restore();
  g.fillStyle = TRC_CYAN;
  for (let k = -1; k <= 1; k++) {   // pins
    g.fillRect(x - s - 3, y + k * 4 - 0.5, 3, 1); g.fillRect(x + s, y + k * 4 - 0.5, 3, 1);
    g.fillRect(x + k * 4 - 0.5, y - s - 3, 1, 3); g.fillRect(x + k * 4 - 0.5, y + s, 1, 3);
  }
  if (born >= 1) {
    g.textBaseline = 'middle';
    trcText(TRC_EXPLOITS[c.kind].tag, x, y + 1, 7, TRC_CYAN);
    g.textBaseline = 'alphabetic';
  }
}

// Daemons: patrol = a red scanner block on a dashed lane; hunter = a rose arrowhead
function trcDrawDaemon(d) {
  const g = trcCtx, C = TRC_CELL;
  const frozen = trcFrozen(), vuln = trcRooted();
  // drawn at its true cell, leaning toward the next one so it never looks a step behind
  const moving = trcPhase === 'tracing' && !frozen && !(d.kind === 'hunter' && d.wake > 0);
  const nx = trcNext(d.i, d.dir);
  const k = (moving && nx >= 0 && !trcDaemonBlocked(nx, d)) ? Math.min(1, d.acc) * 0.6 : 0;
  const sx = trcCX(d.i) + TRC_DX[d.dir] * k * C, sy = trcCY(d.i) + TRC_DY[d.dir] * k * C;
  const col = d.kind === 'hunter' ? TRC_ROSE : TRC_RED;
  if (d.kind === 'patrol') {
    // its lane, so a kid can read where it's going
    const horiz = d.dir % 2 === 1;
    let a = d.i, b = d.i;
    for (let j = trcNext(a, horiz ? 3 : 0); j >= 0 && !trcGrid[j]; j = trcNext(j, horiz ? 3 : 0)) a = j;
    for (let j = trcNext(b, horiz ? 1 : 2); j >= 0 && !trcGrid[j]; j = trcNext(j, horiz ? 1 : 2)) b = j;
    g.setLineDash([2, 5]); g.strokeStyle = 'rgba(248,113,113,0.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(trcCX(a), trcCY(a)); g.lineTo(trcCX(b), trcCY(b)); g.stroke(); g.setLineDash([]);
    g.save();
    if (!frozen) { g.shadowColor = col; g.shadowBlur = 10; }
    g.fillStyle = frozen ? '#164E63' : '#450A0A'; g.fillRect(sx - 8, sy - 8, 16, 16);
    g.strokeStyle = frozen ? TRC_CYAN : col; g.lineWidth = 2;
    if (vuln) g.setLineDash([3, 2]);
    g.strokeRect(sx - 7, sy - 7, 14, 14);
    g.restore();
    const sweep = frozen ? 0 : Math.sin(trcClock / 140) * 4;   // the scanner eye
    g.fillStyle = frozen ? TRC_CYAN : col; g.fillRect(sx - 1.5 + sweep, sy - 4, 3, 8);
  } else {
    d.trail.forEach((i, n) => {
      g.fillStyle = `rgba(251,113,133,${0.22 - n * 0.06})`;
      g.fillRect(trcCol(i) * C + 5, TRC_FY + trcRow(i) * C + 5, C - 10, C - 10);
    });
    const asleep = d.wake > 0;
    g.save();
    g.translate(sx, sy); g.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][d.dir]);
    g.globalAlpha = asleep ? 0.35 + 0.35 * Math.abs(Math.sin(trcClock / 150)) : 1;
    if (!frozen && !asleep) { g.shadowColor = col; g.shadowBlur = 12; }
    g.beginPath(); g.moveTo(0, -9); g.lineTo(8, 7); g.lineTo(0, 3); g.lineTo(-8, 7); g.closePath();
    g.fillStyle = frozen ? '#164E63' : '#4C0519'; g.fill();
    g.strokeStyle = frozen ? TRC_CYAN : col; g.lineWidth = 2;
    if (vuln) g.setLineDash([3, 2]);
    g.stroke();
    g.restore();
    if (asleep) {
      g.beginPath(); g.arc(sx, sy, 13 + 4 * Math.sin(trcClock / 120), 0, Math.PI * 2);
      g.strokeStyle = 'rgba(251,113,133,0.4)'; g.lineWidth = 1; g.stroke();
    }
  }
}

// The trace: a lit wire through cell centres, white-hot at the head.
// `frac` slides the head and tail between cells so it never looks steppy.
function trcDrawTrace(body, dir, grow, frac, alpha, ramp, ring) {
  if (!body.length) return;
  const g = trcCtx;
  const pts = body.map(i => [trcCX(i), trcCY(i)]);
  const head = [pts[0][0] + TRC_DX[dir] * frac * TRC_CELL, pts[0][1] + TRC_DY[dir] * frac * TRC_CELL];
  if (grow === 0 && pts.length > 1) {
    const a = pts[pts.length - 1], b = pts[pts.length - 2];
    pts[pts.length - 1] = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
  }
  const path = [head].concat(pts);
  const hot = ramp === TRC_RAMP_RED ? TRC_RED : ramp === TRC_RAMP_ROOT ? TRC_CYAN : TRC_EMERALD;
  g.save();
  g.globalAlpha = alpha;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const trace = () => { g.beginPath(); g.moveTo(path[0][0], path[0][1]); for (let k = 1; k < path.length; k++) g.lineTo(path[k][0], path[k][1]); };
  if (path.length > 1) {
    trace();
    g.strokeStyle = ramp === TRC_RAMP_RED ? 'rgba(248,113,113,0.16)' : ramp === TRC_RAMP_ROOT ? 'rgba(34,211,238,0.2)' : 'rgba(16,185,129,0.2)';
    g.lineWidth = 17; g.stroke();
    for (let k = 0; k < path.length - 1; k++) {
      const t = k / Math.max(1, path.length - 2);
      g.beginPath(); g.moveTo(path[k][0], path[k][1]); g.lineTo(path[k + 1][0], path[k + 1][1]);
      g.strokeStyle = trcMix(ramp, t); g.lineWidth = 11 - 4 * t; g.stroke();
    }
    trace(); g.strokeStyle = 'rgba(236,253,245,0.5)'; g.lineWidth = 2; g.stroke();
  }
  if (ring) {
    g.beginPath(); g.arc(head[0], head[1], 11 + Math.sin(trcClock / 90) * 1.5, 0, Math.PI * 2);
    g.strokeStyle = TRC_VIOLET; g.lineWidth = 2; g.stroke();
  }
  g.shadowColor = hot; g.shadowBlur = 12;
  g.fillStyle = ramp === TRC_RAMP_RED ? '#FECACA' : ramp === TRC_RAMP_ROOT ? '#CFFAFE' : TRC_HEAD;
  g.fillRect(head[0] - 6, head[1] - 6, 12, 12);
  g.restore();
}

function trcHeadFrac() {
  if (trcPhase !== 'tracing' || trcGrace) return { dir: trcDir, f: 0 };
  const d = trcQueue.length ? trcQueue[0] : trcDir;
  if (!trcCanGo(d)) return { dir: d, f: 0 };
  return { dir: d, f: Math.min(1, trcAcc) };
}

function trcFieldNow() {
  return { grid: trcGrid, honey: trcLayout.honey, ingress: trcLayout.ingress, warns: trcWarns,
    packet: trcPacket, egress: trcEgress, inHoney: trcInHoney && trcPhase === 'tracing', rooted: trcRooted() };
}

function trcDrawHUD() {
  const g = trcCtx;
  g.fillStyle = TRC_GRID; g.fillRect(0, 4, TRC_W, 84);
  g.strokeStyle = 'rgba(16,185,129,0.45)'; g.lineWidth = 1; g.strokeRect(0.5, 4.5, TRC_W - 1, 83);
  trcText('user:\\breach', 10, 25, 12, TRC_EM_HI, 'left');
  trcText(`NODE ${trcPad(trcNode)}`, TRC_W / 2, 25, 12, '#CBD5E1');
  trcDrawRetries(TRC_W - 10, 25, 'right');
  g.strokeStyle = 'rgba(100,116,139,0.35)';
  g.beginPath(); g.moveTo(8, 34.5); g.lineTo(TRC_W - 8, 34.5); g.stroke();

  trcText(`DATA: ${trcFmt(trcDisp)} KB`, 10, 63, 12, TRC_HEAD, 'left');
  const s = Math.max(0, Math.ceil(trcTimeLeft));
  const frozen = trcFrozen() && trcPhase === 'tracing';
  const hot = s <= 5 && trcPhase === 'tracing' && !frozen;
  const blink = hot && Math.floor(trcClock / 250) % 2 === 1;
  trcText(`${(s / 60) | 0}:${trcPad(s % 60)}`, TRC_W / 2, 67, 26,
    frozen ? TRC_CYAN : hot ? (blink ? '#FCA5A5' : TRC_RED) : trcLock && trcPhase === 'tracing' ? TRC_RED : TRC_EM_HI);
  // packets to go
  const open = trcEgress >= 0 || trcPhase === 'breached';
  const px = TRC_W - 58, py = 58;
  g.beginPath(); g.moveTo(px, py - 6); g.lineTo(px + 6, py); g.lineTo(px, py + 6); g.lineTo(px - 6, py); g.closePath();
  g.fillStyle = open ? TRC_EM_HI : TRC_PACKET; g.fill();
  trcText(`${Math.min(trcGot, trcT.packets)}/${trcT.packets}`, TRC_W - 10, 63, 12, open ? TRC_EM_HI : TRC_HEAD, 'right');
  // the Hardening Window, draining — or the running exploit's own clock
  const w = (TRC_W - 16) * Math.max(0, trcTimeLeft / trcT.window);
  g.fillStyle = 'rgba(100,116,139,0.3)'; g.fillRect(8, 78, TRC_W - 16, 3);
  g.fillStyle = frozen ? TRC_CYAN : (hot || trcLock) ? TRC_RED : TRC_EMERALD; g.fillRect(8, 78, w, 3);
  if (trcActive && trcPhase === 'tracing') {
    const left = Math.max(0, trcActive.until - trcClock) / (TRC_EXPLOIT_S * 1000);
    g.fillStyle = TRC_CYAN; g.fillRect(8, 83, (TRC_W - 16) * Math.min(1, left), 2);
  }
}

function trcDrawRetries(x, y, align) {
  const g = trcCtx, w = 50;
  let left = align === 'right' ? x - w : x - w / 2;
  trcText('[', left, y, 13, TRC_DIM, 'left');
  left += 9;
  for (let k = 0; k < TRC_RETRIES; k++) {
    if (k < trcRetries) { g.fillStyle = TRC_EM_HI; g.fillRect(left, y - 9, 8, 8); }
    else { g.strokeStyle = TRC_DIM; g.lineWidth = 1; g.strokeRect(left + 0.5, y - 8.5, 7, 7); }
    left += 11;
  }
  trcText(']', left, y, 13, TRC_DIM, 'left');
}

function trcDrawStatus() {
  let msg = '> ROUTING: VALID', col = TRC_EMERALD;
  const pulse = 0.55 + 0.45 * Math.sin(trcClock / 160);
  if (trcPhase === 'boot') { msg = trcAttempt > 1 ? '> REROUTING VIA INGRESS…' : '> SECURING INGRESS…'; col = TRC_SOFT; }
  else if (trcPhase === 'breached') { msg = '> NODE BREACHED'; col = TRC_EM_HI; }
  else if (trcPhase === 'terminated') { msg = trcFail === 'timeout' ? '> NODE LOCKED' : '> CONNECTION TERMINATED'; col = TRC_RED; }
  else if (trcActive) { msg = `> ${TRC_EXPLOITS[trcActive.kind].name} ${(Math.max(0, trcActive.until - trcClock) / 1000).toFixed(1)}s`; col = TRC_CYAN; }
  else if (trcInHoney) { msg = '> HONEYPOT'; col = TRC_VIOLET; }
  else if (trcEgress >= 0) { msg = '> EGRESS OPEN ▸'; col = `rgba(52,211,153,${pulse})`; }
  const g = trcCtx;
  g.strokeStyle = 'rgba(100,116,139,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(8, 590.5); g.lineTo(TRC_W - 8, 590.5); g.stroke();
  trcText(msg, 12, 613, 14, col, 'left');
  if (trcPhase === 'tracing') {
    const blinkOn = Math.floor(trcClock / 110) % 2;
    if (trcLock) trcText('LOCKDOWN', TRC_W - 12, 613, 12, blinkOn ? TRC_RED : 'rgba(248,113,113,0.45)', 'right');
    else if (trcWarns.length) trcText('HARDENING', TRC_W - 12, 613, 11, blinkOn ? TRC_RED : 'rgba(248,113,113,0.4)', 'right');
  }
  trcText(`TRACE ${trcLen()}`, 12, 632, 10, TRC_DIM, 'left');
  if (trcChain >= 2 && trcClock - trcChainT <= TRC_CHAIN_MS && trcPhase === 'tracing') {
    const left = 1 - (trcClock - trcChainT) / TRC_CHAIN_MS;
    trcText(`CHAIN ×${trcChain}`, TRC_W - 12, 632, 10, TRC_PACKET, 'right');
    g.fillStyle = 'rgba(253,230,138,0.55)'; g.fillRect(TRC_W - 12 - 60 * left, 636, 60 * left, 1.5);
  }
}

function trcDrawPlay() {
  const g = trcCtx, t = trcClock - trcPhaseT;
  trcDrawHUD();
  trcDrawField(trcFieldNow());
  if (trcLock && trcPhase === 'tracing') {   // LOCKDOWN: the frame closes in, pulsing red
    const p = 0.5 + 0.5 * Math.sin(trcClock / 120);
    g.strokeStyle = `rgba(248,113,113,${0.35 + 0.45 * p})`; g.lineWidth = 3;
    g.strokeRect(1.5, TRC_FY + 1.5, TRC_W - 3, TRC_ROWS * TRC_CELL - 3);
    g.fillStyle = `rgba(248,113,113,${0.04 + 0.04 * p})`; g.fillRect(0, TRC_FY, TRC_W, TRC_ROWS * TRC_CELL);
  }
  if (trcFrozen() && trcPhase === 'tracing') {
    g.fillStyle = 'rgba(34,211,238,0.06)'; g.fillRect(0, TRC_FY, TRC_W, TRC_ROWS * TRC_CELL);
    g.strokeStyle = 'rgba(34,211,238,0.6)'; g.lineWidth = 2; g.strokeRect(1, TRC_FY + 1, TRC_W - 2, TRC_ROWS * TRC_CELL - 2);
  }
  trcChips.forEach(trcDrawChip);
  trcGhosts.forEach(gh => {
    const a = 1 - (trcClock - gh.at) / 300;
    g.fillStyle = `rgba(52,211,153,${0.22 * a})`;
    g.fillRect(trcCol(gh.i) * TRC_CELL + 3, TRC_FY + trcRow(gh.i) * TRC_CELL + 3, TRC_CELL - 6, TRC_CELL - 6);
  });

  if (trcPhase === 'breached') {
    trcDrawTrace(trcBody, trcDir, trcGrow, 0, Math.max(0, 1 - t / 450), TRC_RAMP_OK, false);
    trcDrawReplay(t);
  } else if (trcPhase === 'terminated') {
    if (trcFail === 'timeout') trcDrawTrace(trcBody, trcDir, trcGrow, 0, 0.85, TRC_RAMP_RED, false);
  } else {
    const hf = trcHeadFrac();
    trcDrawTrace(trcBody, hf.dir, trcGrow, hf.f, trcRooted() ? 0.85 : 1, trcRooted() ? TRC_RAMP_ROOT : TRC_RAMP_OK,
      trcInHoney && trcPhase === 'tracing');
  }
  if (trcPhase !== 'breached') trcDaemons.forEach(d => { if (!d.dead) trcDrawDaemon(d); });
  trcDrawStatus();

  if (trcPhase === 'boot') trcDrawBoot(t);
  else if (trcPhase === 'breached') trcDrawBreachPanel(t);
  else if (trcPhase === 'terminated') trcDrawTerminated(t);
}

function trcDrawBoot(t) {
  const g = trcCtx, mid = TRC_FY + TRC_ROWS * TRC_CELL / 2, B = trcBootMs;
  const intro = B === TRC_BOOT_INTRO_MS ? TRC_INTRO[trcInfo.intro] : null;
  g.fillStyle = `rgba(15,23,42,${0.6 * Math.min(1, (B - t) / 250)})`;
  g.fillRect(1, TRC_FY + 1, TRC_W - 2, TRC_ROWS * TRC_CELL - 2);
  const a = Math.max(0, Math.min(1, t / 150) * Math.min(1, (B - t) / 200));
  g.globalAlpha = a;
  g.save(); g.shadowColor = TRC_EMERALD; g.shadowBlur = 14;
  trcText(`NODE ${trcPad(trcNode)}`, TRC_W / 2, mid - 22, 38, TRC_HEAD);
  g.restore();
  trcText(trcDecrypt(trcInfo.sub, t / 1000), TRC_W / 2, mid + 6, 13, intro ? intro.col : TRC_SOFT);
  if (intro && t > 450) {
    // the new-process banner: a terminal alert strip across the field
    const k = Math.min(1, (t - 450) / 180);
    const y = mid + 30;
    g.fillStyle = 'rgba(30,41,59,0.95)'; g.fillRect(24, y, (TRC_W - 48) * k, 46);
    g.fillStyle = intro.col; g.fillRect(24, y, 3, 46);
    if (k >= 1) {
      trcText('[!] NEW PROCESS DETECTED', 38, y + 18, 11, TRC_SOFT, 'left');
      trcText(intro.label, 38, y + 37, 14, intro.col, 'left');
      trcDrawIntroIcon(trcInfo.intro, TRC_W - 52, y + 23);
    }
  } else if (!intro) {
    trcText(trcAttempt > 1 ? 'REROUTING VIA INGRESS…' : 'SECURING INGRESS…', TRC_W / 2, mid + 30, 11, TRC_DIM);
    if (trcNode > 1 && trcAttempt === 1) trcText(`TRACE LENGTH ${trcCarry}`, TRC_W / 2, mid + 50, 11, TRC_EM_HI);
  }
  g.globalAlpha = 1;
}

// A small glyph of the new thing, drawn exactly as it appears in play
function trcDrawIntroIcon(key, x, y) {
  const g = trcCtx;
  if (key === 'firewall') {
    for (let k = -1; k <= 1; k++) { g.fillStyle = TRC_EM_DK; g.fillRect(x - 9 + k * 18 - 9, y - 9, 18, 18); g.fillStyle = TRC_EM_HI; g.fillRect(x - 9 + k * 18 - 9, y - 9, 18, 2); }
  } else if (key === 'honeypot') {
    g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.setLineDash([5, 4]); g.strokeStyle = TRC_VIOLET; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fillStyle = TRC_VIOLET; g.fill();
  } else if (key === 'daemon') {
    g.fillStyle = '#450A0A'; g.fillRect(x - 9, y - 9, 18, 18); g.strokeStyle = TRC_RED; g.lineWidth = 2; g.strokeRect(x - 8, y - 8, 16, 16);
    g.fillStyle = TRC_RED; g.fillRect(x - 1.5 + Math.sin(trcClock / 140) * 4, y - 5, 3, 10);
  } else if (key === 'exploit') {
    g.fillStyle = '#083344'; g.fillRect(x - 9, y - 9, 18, 18); g.strokeStyle = TRC_CYAN; g.lineWidth = 1.5; g.strokeRect(x - 8.5, y - 8.5, 17, 17);
    g.textBaseline = 'middle'; trcText('RK', x, y + 1, 8, TRC_CYAN); g.textBaseline = 'alphabetic';
  } else if (key === 'lockdown') {
    const p = 0.5 + 0.5 * Math.sin(trcClock / 120);
    g.strokeStyle = `rgba(248,113,113,${0.4 + 0.6 * p})`; g.lineWidth = 3; g.strokeRect(x - 16, y - 12, 32, 24);
  } else if (key === 'hunter') {
    g.save(); g.translate(x, y);
    g.beginPath(); g.moveTo(0, -11); g.lineTo(10, 9); g.lineTo(0, 4); g.lineTo(-10, 9); g.closePath();
    g.fillStyle = '#4C0519'; g.fill(); g.strokeStyle = TRC_ROSE; g.lineWidth = 2; g.stroke(); g.restore();
  }
}

// After a breach, Net-Trace style: play back the route you actually took
function trcDrawReplay(t) {
  const g = trcCtx, n = trcRoute.length;
  if (n < 2) return;
  const p = Math.min(1, t / 900) * (n - 1);
  const whole = Math.floor(p), part = p - whole;
  g.save();
  g.globalAlpha = t > 900 ? 0.55 : 1;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(trcCX(trcRoute[0]), trcCY(trcRoute[0]));
  for (let k = 1; k <= whole; k++) g.lineTo(trcCX(trcRoute[k]), trcCY(trcRoute[k]));
  let tx = trcCX(trcRoute[whole]), ty = trcCY(trcRoute[whole]);
  if (whole < n - 1) {
    tx += (trcCX(trcRoute[whole + 1]) - tx) * part; ty += (trcCY(trcRoute[whole + 1]) - ty) * part;
    g.lineTo(tx, ty);
  }
  g.strokeStyle = 'rgba(52,211,153,0.25)'; g.lineWidth = 7; g.stroke();
  g.strokeStyle = TRC_EM_HI; g.lineWidth = 2; g.stroke();
  g.shadowColor = TRC_EMERALD; g.shadowBlur = 10;
  g.fillStyle = TRC_HEAD; g.fillRect(tx - 3, ty - 3, 6, 6);
  g.restore();
}

function trcDrawBreachPanel(t) {
  if (t < 750) return;
  const g = trcCtx, a = Math.min(1, (t - 750) / 180);
  const x = 22, y = 222, w = TRC_W - 44, h = 214;
  g.globalAlpha = a;
  g.fillStyle = 'rgba(15,23,42,0.93)'; g.fillRect(x, y, w, h);
  g.strokeStyle = TRC_EMERALD; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = TRC_GRID; g.fillRect(x + 2, y + 2, w - 4, 20);
  trcText('[ SYS_STAT ]', x + 10, y + 16, 11, TRC_DIM, 'left');
  trcText(`NT-NODE-${trcPad(trcNode)}`, x + w - 10, y + 16, 11, TRC_DIM, 'right');
  g.save(); g.shadowColor = TRC_EMERALD; g.shadowBlur = 12;
  trcText('NODE BREACHED', TRC_W / 2, y + 58, 26, TRC_EM_HI);
  g.restore();
  trcText(`HOPS ${trcBonus.hops} · ${trcBonus.latency.toFixed(1)}s · TRACE ${trcBonus.len}`, TRC_W / 2, y + 82, 12, TRC_SOFT);
  if (t >= 1050) trcText(`WINDOW ${trcBonus.secs}s  +${trcFmt(trcBonus.window)} KB`, TRC_W / 2, y + 118, 14, TRC_HEAD);
  if (t >= 1400) {
    if (trcBonus.clean) trcText('CLEAN TRACE +128 KB', TRC_W / 2, y + 144, 14, TRC_PACKET);
    else trcText('HONEYPOT CONTACT LOGGED', TRC_W / 2, y + 144, 12, 'rgba(139,92,246,0.85)');
  }
  if (t >= 1700) {
    const line = `SYS_INIT // ${TRC_HEX} // NT-NODE-${trcPad(trcNode + 1)}`;
    const n = Math.min(line.length, Math.floor((t - 1700) / 1000 * 70));
    const cursor = Math.floor(trcClock / 260) % 2 === 0 ? '█' : ' ';
    trcText(line.slice(0, n) + (n < line.length || cursor === '█' ? cursor : ''), x + 12, y + 192, 11, TRC_DIM, 'left');
  }
  g.globalAlpha = 1;
}

function trcDrawTerminated(t) {
  const g = trcCtx, mid = TRC_FY + TRC_ROWS * TRC_CELL / 2;
  if (trcFail === 'timeout') {
    // the admin locks the Node: a red lattice over everything
    g.fillStyle = 'rgba(127,29,29,0.22)'; g.fillRect(1, TRC_FY + 1, TRC_W - 2, TRC_ROWS * TRC_CELL - 2);
    g.strokeStyle = 'rgba(248,113,113,0.18)'; g.lineWidth = 1;
    g.beginPath();
    for (let c = 1; c < TRC_COLS; c++) { g.moveTo(c * TRC_CELL + 0.5, TRC_FY); g.lineTo(c * TRC_CELL + 0.5, TRC_FY + TRC_ROWS * TRC_CELL); }
    for (let r = 1; r < TRC_ROWS; r++) { g.moveTo(0, TRC_FY + r * TRC_CELL + 0.5); g.lineTo(TRC_W, TRC_FY + r * TRC_CELL + 0.5); }
    g.stroke();
  }
  const a = Math.min(1, t / 120);
  g.globalAlpha = a;
  g.fillStyle = 'rgba(15,23,42,0.9)'; g.fillRect(16, mid - 60, TRC_W - 32, 120);
  g.strokeStyle = TRC_RED; g.lineWidth = 2; g.strokeRect(17, mid - 59, TRC_W - 34, 118);
  if (trcFail === 'timeout') trcText('TRACE TIMEOUT — NODE LOCKED', TRC_W / 2, mid - 22, 17, TRC_RED);
  else {
    trcText('CONNECTION TERMINATED', TRC_W / 2, mid - 24, 20, TRC_RED);
    if (TRC_WHY[trcFailWhy]) trcText(`// ${TRC_WHY[trcFailWhy]}`, TRC_W / 2, mid - 2, 11, TRC_SOFT);
  }
  if (trcFinal) trcText('NO RETRIES REMAINING', TRC_W / 2, mid + 32, 12, TRC_SOFT);
  else { trcText('RETRIES', TRC_W / 2 - 42, mid + 34, 12, TRC_SOFT); trcDrawRetries(TRC_W / 2 + 34, mid + 34, 'center'); }
  g.globalAlpha = 1;
}

// Keep overlays away from the head: top of the field normally, bottom if it's up there
function trcHeadHigh() { return trcBody.length && trcRow(trcBody[0]) < 9; }

function trcDrawShout() {
  const s = trcShout;
  if (!s || trcPhase === 'boot') return;
  const g = trcCtx;
  const a = s.t > s.life - 0.25 ? Math.max(0, (s.life - s.t) / 0.25) : 1;
  const y = trcHeadHigh() ? 480 : 178;
  const size = s.loud ? 20 : 16;
  const text = '>> ' + trcDecrypt(s.text, s.t);
  g.font = `bold ${size}px monospace`;
  const w = g.measureText('>> ' + s.text).width + 28;
  const pop = s.t < 0.1 ? 1.25 - s.t * 2.5 : 1;
  g.save(); g.globalAlpha = a;
  g.translate(TRC_W / 2, y); g.scale(pop, pop);
  g.fillStyle = 'rgba(15,23,42,0.88)'; g.fillRect(-w / 2, -size, w, size * 1.8);
  g.fillStyle = s.col; g.fillRect(-w / 2, -size, 3, size * 1.8); g.fillRect(w / 2 - 3, -size, 3, size * 1.8);
  if (s.loud) { g.shadowColor = s.col; g.shadowBlur = 12; }
  g.textBaseline = 'middle';
  trcText(text, 0, -size * 0.1, size, s.col);
  g.restore();
  g.textBaseline = 'alphabetic';
}

function trcDrawCoach() {
  const c = trcCoach;
  if (!c || trcPhase !== 'tracing') return;
  const g = trcCtx;
  const lines = trcWrap(c.text, 300, 11), h = lines.length * 15 + 14;
  const y = trcHeadHigh() ? TRC_FY + TRC_ROWS * TRC_CELL - h - 6 : TRC_FY + 6;
  const a = Math.min(1, c.t / 0.2) * (c.t > 5 ? Math.max(0, (5.5 - c.t) / 0.5) : 1);
  g.globalAlpha = a;
  g.fillStyle = 'rgba(30,41,59,0.92)'; g.fillRect(10, y, TRC_W - 20, h);
  g.strokeStyle = 'rgba(16,185,129,0.6)'; g.lineWidth = 1; g.strokeRect(10.5, y + 0.5, TRC_W - 21, h - 1);
  trcText('>', 18, y + 19, 11, TRC_EMERALD, 'left');
  lines.forEach((l, k) => trcText(l, 32, y + 19 + k * 15, 11, TRC_HEAD, 'left'));
  g.globalAlpha = 1;
}

function trcDrawOver() {
  const g = trcCtx;
  trcDrawHUD();
  trcDrawField(trcFieldNow());
  g.fillStyle = 'rgba(15,23,42,0.84)'; g.fillRect(0, 0, TRC_W, TRC_H);
  g.save(); g.shadowColor = TRC_RED; g.shadowBlur = 14;
  trcText('SESSION TERMINATED', TRC_W / 2, 270, 28, TRC_RED);
  g.restore();
  trcText('root@amaze_inc:~# logout', TRC_W / 2, 300, 11, TRC_DIM);
  trcText('DATA EXTRACTED', TRC_W / 2, 350, 12, TRC_SOFT);
  trcText(`${trcFmt(trcLastScore)} KB`, TRC_W / 2, 388, 32, TRC_PACKET);
  trcText(`NODES BREACHED: ${trcBreachedCount} · LONGEST TRACE: ${trcMaxLen}`, TRC_W / 2, 422, 11, TRC_SOFT);
  if (trcKills) trcText(`DAEMONS TERMINATED: ${trcKills}`, TRC_W / 2, 442, 11, TRC_CYAN);
}

function trcDrawAttract() {
  const g = trcCtx, d = trcDemo, el = trcClock - trcAttractT, T = trcAttractTimes();
  if (d) {
    g.globalAlpha = 0.3;
    trcDrawField({ grid: d.grid, honey: d.honey, ingress: d.ingress, warns: [], packet: -1, egress: -1, inHoney: false });
    g.globalAlpha = 1;
    trcDrawTrace(d.body, d.dir, d.grow, 0, 0.35, TRC_RAMP_OK, false);
  }
  g.fillStyle = 'rgba(15,23,42,0.5)'; g.fillRect(0, 0, TRC_W, TRC_H);

  // the boot log, typed out on the game clock
  let chars = el / 1000 * TRC_CPS;
  const cursorOn = Math.floor(trcClock / 260) % 2 === 0;
  TRC_BOOT_LOG.forEach((line, k) => {
    if (chars <= 0) return;
    const n = Math.min(line.length, Math.floor(chars));
    const y = 46 + k * 18;
    trcText(line.slice(0, n), 16, y, 12, k === TRC_BOOT_LOG.length - 1 ? TRC_EM_HI : TRC_EMERALD, 'left');
    if (n < line.length && cursorOn) { g.font = 'bold 12px monospace'; g.fillStyle = TRC_EM_HI; g.fillRect(16 + g.measureText(line.slice(0, n)).width + 1, y - 10, 7, 12); }
    chars -= line.length;
  });

  if (el >= T.titleAt) {
    const a = Math.min(1, (el - T.titleAt) / 280);
    g.globalAlpha = a;
    g.save(); g.shadowColor = TRC_EMERALD; g.shadowBlur = 18;
    trcText(TRC_TITLE, TRC_W / 2, 290, 44, TRC_HEAD);
    g.restore();
    g.fillStyle = TRC_EMERALD; g.fillRect(TRC_W / 2 - 120, 306, 240 * a, 2);
    g.globalAlpha = 1;
  }
  if (el >= T.roleAt) {
    const n = Math.min(TRC_ROLE.length, Math.floor((el - T.roleAt) / 1000 * TRC_CPS));
    const s = TRC_ROLE.slice(0, n);
    trcText(s, TRC_W / 2, 342, 13, TRC_EM_HI);
    if (cursorOn) { g.font = 'bold 13px monospace'; const w = g.measureText(TRC_ROLE).width; g.fillStyle = TRC_EM_HI; g.fillRect(TRC_W / 2 - w / 2 + g.measureText(s).width + 2, 331, 7, 13); }
  }
  if (el >= T.btnAt) {
    trcDrawButton(TRC_BTN_PLAY, 'INITIALISE ▶', 24);
    trcText('Swipe to route the signal.', TRC_W / 2, 528, 12, TRC_SOFT);
    if (trcScores.length) {
      const top = trcScores[0];
      trcText(`TOP  user:\\${top.name}  ${trcFmt(top.score)} KB`, TRC_W / 2, 566, 11, TRC_DIM);
    }
  }
}

function trcDrawNameEntry() {
  const g = trcCtx;
  trcText('root@amaze_inc:~# ./register --callsign', TRC_W / 2, 150, 11, TRC_DIM);
  trcText('ENTER CALLSIGN', TRC_W / 2, 200, 26, TRC_EM_HI);
  trcText(`${trcFmt(trcLastScore)} KB EXTRACTED`, TRC_W / 2, 236, 14, TRC_PACKET);
  trcText(`user:\\${trcInitials.map(i => TRC_ALPHABET[i]).join('')}`, TRC_W / 2, 270, 13, TRC_SOFT);
  TRC_SLOTS.forEach((r, k) => {
    g.fillStyle = TRC_GRID; g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = TRC_EMERALD; g.lineWidth = 2; g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    g.textBaseline = 'middle';
    trcText(TRC_ALPHABET[trcInitials[k]], r.x + r.w / 2, r.y + r.h / 2 + 2, 44, TRC_HEAD);
    g.textBaseline = 'alphabetic';
    g.fillStyle = TRC_EMERALD; g.fillRect(r.x + 14, r.y + r.h - 12, r.w - 28, 2);
  });
  trcText('Tap a letter to change it.', TRC_W / 2, 410, 12, TRC_SOFT);
  trcDrawButton(TRC_BTN_OK, 'COMMIT ▶', 22);
}

function trcDrawBoard() {
  const g = trcCtx;
  trcText('// EXTRACTION LOG', TRC_W / 2, 100, 22, TRC_EM_HI);
  trcText('root@amaze_inc:~# cat ./extract.log', TRC_W / 2, 126, 11, TRC_DIM);
  for (let k = 0; k < TRC_TOP_N; k++) {
    const e = trcScores[k], y = 186 + k * 48;
    const mine = e && e === trcLastEntry;
    if (mine) { g.fillStyle = 'rgba(253,230,138,0.08)'; g.fillRect(16, y - 26, TRC_W - 32, 38); }
    trcText(trcPad(k + 1), 24, y, 14, TRC_DIM, 'left');
    trcText(e ? `user:\\${e.name}` : 'user:\\---', 58, y, 15, e ? (mine ? TRC_PACKET : TRC_HEAD) : TRC_DOT, 'left');
    trcText(e ? `${trcFmt(e.score)} KB` : '— KB', TRC_W - 24, y, 15, e ? (mine ? TRC_PACKET : TRC_EM_HI) : TRC_DOT, 'right');
    g.font = 'bold 15px monospace';
    const lx = 58 + g.measureText(e ? `user:\\${e.name}` : 'user:\\---').width + 8;
    const rx = TRC_W - 24 - g.measureText(e ? `${trcFmt(e.score)} KB` : '— KB').width - 8;
    if (rx > lx) {
      g.setLineDash([2, 4]); g.strokeStyle = 'rgba(100,116,139,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(lx, y - 4.5); g.lineTo(rx, y - 4.5); g.stroke(); g.setLineDash([]);
    }
  }
  trcText(`THIS RUN  ${trcFmt(trcLastScore)} KB · ${trcBreachedCount} ${trcBreachedCount === 1 ? 'NODE' : 'NODES'}`, TRC_W / 2, 458, 12, TRC_SOFT);
  trcDrawButton(TRC_BTN_LB_AGAIN, 'REBOOT ▶', 22);
  trcDrawButton(TRC_BTN_LB_MENU, 'LOG OFF', 18);
}

// ── Input ──────────────────────────────────────────────────────────────────
function trcToLogical(e) {
  const r = trcCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * TRC_W / r.width, y: (e.clientY - r.top) * TRC_H / r.height };
}
function trcHit(r, p) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

function trcCommitName() {
  TRC_SOUND.select();
  trcSubmit(trcInitials.map(i => TRC_ALPHABET[i]).join(''), trcLastScore);
  trcEnterState('leaderboard');
}

function trcOnDown(p) {
  if (trcState === 'attract') {
    if (!trcAttractReady()) { trcAttractT = trcClock - 1e6; return; }   // a tap skips the boot log
    if (trcHit(TRC_BTN_PLAY, p)) { TRC_SOUND.select(); trcEnterState('playing'); }
    return;
  }
  if (trcState === 'playing') {
    trcPress = { x: p.x, y: p.y };
    if (trcPhase === 'breached' && trcClock - trcPhaseT >= TRC_SKIP_MS) trcNextNode();
    return;
  }
  if (trcState === 'nameEntry') {
    for (let i = 0; i < TRC_SLOTS.length; i++) {
      if (trcHit(TRC_SLOTS[i], p)) { trcInitials[i] = (trcInitials[i] + 1) % 26; TRC_SOUND.select(); return; }
    }
    if (trcHit(TRC_BTN_OK, p)) trcCommitName();
    return;
  }
  if (trcState === 'leaderboard') {
    if (trcHit(TRC_BTN_LB_AGAIN, p)) { TRC_SOUND.select(); trcEnterState('playing'); return; }
    if (trcHit(TRC_BTN_LB_MENU, p))  { TRC_SOUND.select(); trcEnterState('attract'); }
  }
}

function trcOnMove(p) {
  if (trcState !== 'playing' || !trcPress) return;
  const dx = p.x - trcPress.x, dy = p.y - trcPress.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < TRC_SWIPE) return;
  trcQueueTurn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
  trcPress = { x: p.x, y: p.y };   // keep dragging to chain a second turn
}

// Enter / Space: the primary action wherever there is one
function trcPrimary() {
  if (trcState === 'attract') { if (!trcAttractReady()) trcAttractT = trcClock - 1e6; else { TRC_SOUND.select(); trcEnterState('playing'); } }
  else if (trcState === 'playing') { if (trcPhase === 'breached' && trcClock - trcPhaseT >= TRC_SKIP_MS) trcNextNode(); }
  else if (trcState === 'nameEntry') trcCommitName();
  else if (trcState === 'leaderboard') { TRC_SOUND.select(); trcEnterState('playing'); }
}

function trcStagePointer(e, phase) {
  if (phase === 'down') {
    if (trcPtrId !== null) return;           // second finger ignored
    trcPtrId = e.pointerId;
    trcOnDown(trcToLogical(e));
    return;
  }
  if (e.pointerId !== trcPtrId) return;
  if (phase === 'move') { trcOnMove(trcToLogical(e)); return; }
  trcPtrId = null; trcPress = null;          // up / cancel
}

const TRC_KEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };

(function trcBindInput() {
  const stage = document.getElementById('trc-stage');
  stage.addEventListener('pointerdown',  e => { stage.setPointerCapture(e.pointerId); trcStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',  e => { if (e.buttons) trcStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',    e => trcStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => trcStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => trcStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',  e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-traceroute').style.display !== 'none';
  document.addEventListener('keydown', e => {
    if (!visible()) return;
    if (e.code in TRC_KEYS) { e.preventDefault(); trcQueueTurn(TRC_KEYS[e.code]); return; }
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) trcPrimary(); }
  });
  document.getElementById('btn-trc-exit').addEventListener('click', () => { resetArcadeTraceRoute(); arcExitCabinet(); });   // back to the Arcade room
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) { if (trcRafHandle) { cancelAnimationFrame(trcRafHandle); trcRafHandle = null; } trcPress = null; trcPtrId = null; }
    else if (!trcRafHandle) { trcLastT = 0; trcRafHandle = requestAnimationFrame(trcLoop); }
  });
})();

// Crisp letterboxing — identical to apResize/msResize
function trcResize() {
  if (!trcCanvas) return;
  const box = trcCanvas.parentElement;
  const scale = Math.min(box.clientWidth / TRC_W, box.clientHeight / TRC_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  trcCanvas.style.width  = Math.floor(TRC_W * scale) + 'px';
  trcCanvas.style.height = Math.floor(TRC_H * scale) + 'px';
  trcCanvas.width  = Math.floor(TRC_W * scale * dpr);
  trcCanvas.height = Math.floor(TRC_H * scale * dpr);
  trcCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function resetArcadeTraceRoute() {
  if (trcRafHandle) { cancelAnimationFrame(trcRafHandle); trcRafHandle = null; }
  trcState = 'attract'; trcPress = null; trcPtrId = null;
  trcEvents = []; trcParts = []; trcShake = 0; trcFlash = 0; trcHitStop = 0;
  trcQueue = []; trcGrace = 0; trcWarns = []; trcGlitchUntil = 0;
  trcActive = null; trcShout = null; trcCoach = null; trcCoachQ = [];
  // trcScores and trcCoachSeen are NOT cleared — they last the session.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-traceroute').style.display !== 'none') trcResize();
});
