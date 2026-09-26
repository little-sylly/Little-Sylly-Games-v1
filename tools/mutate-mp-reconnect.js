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
