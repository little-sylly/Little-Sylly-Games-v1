// ═══════════════════════════════════════════════════════════════════════════
// mutate-li5-loopback.js — the LI5_SRC= broken-copy runs (LI5 pilot spec § 5.10).
// Each mutant reverts ONE load-bearing line in a temp copy of js/games/li5.js and
// drives tools/verify-li5-loopback.js against it. Every mutant must turn the loopback
// RED; a green run is a survivor — a line the loopback does not actually watch.
// The run prints which sections caught each one.
//
//   node tools/mutate-li5-loopback.js     (exits 1 if any mutant survives)
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
// LF-normalised: core.autocrlf is on in this repo; multi-line anchors would read STALE otherwise.
const SRC = fs.readFileSync(path.join(ROOT, 'js/games/li5.js'), 'utf8').replace(/\r\n/g, '\n');

const MUTANTS = [
  // The four the spec names (§ 5.10)…
  ['the word rides LI5_CARD for a Skip / Nay too (privacy)',
   "  if (mark === 'correct') last.word = card.word;", '  last.word = card.word;'],
  ['no seat check on LI5_MARK (anyone can mark)',
   "    case 'LI5_MARK':     if (up) li5HostMark(p.cardNo, p.mark); return;",
   "    case 'LI5_MARK':     li5HostMark(p.cardNo, p.mark); return;"],
  ['p.log read raw (Firebase erased an empty Report Card)',
   '    roundLog      = li5WireList(p.log).map(li5WireEntry);', '    roundLog      = p.log;'],
  ['no host cooldown on LI5_DOB',
   '  if (now - (H.dobAt[seat] || -Infinity) < LI5_DOB_COOLDOWN_MS) return;\n', ''],
  // …and the one the build itself found (the describer's optimistic advance).
  ['the describer advances AFTER sending its mark',
   "    li5RenderPlay();\n  }\n  li5Act('LI5_MARK', { cardNo: c.cardNo, mark });\n}",
   "    li5RenderPlay();\n  }\n}"],
];
const PRE = "  if (window.syllyMultiplayerMode === 'client' && li5V.phase === 'play') {\n    li5V.card = li5V.next";

let survivors = 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'li5mut-'));
for (const [label, from, to] of MUTANTS) {
  if (!SRC.includes(from)) { console.log('  STALE  ' + label + ' — anchor not found; update this mutant'); survivors++; continue; }
  let src = SRC.replace(from, to);
  if (label.startsWith('the describer advances AFTER')) {           // move the send above the advance
    if (!src.includes(PRE)) { console.log('  STALE  ' + label); survivors++; continue; }
    src = src.replace(PRE, "  li5Act('LI5_MARK', { cardNo: c.cardNo, mark });\n" + PRE);
  }
  const file = path.join(tmp, 'li5.js');
  fs.writeFileSync(file, src);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'verify-li5-loopback.js')],
    { env: Object.assign({}, process.env, { LI5_SRC: file }), encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const killed = r.status !== 0 && /CHECKS FAILED/.test(out);
  if (!killed) survivors++;
  // Which sections caught it: the section header above each FAIL.
  const caught = new Set();
  let sec = '';
  out.split('\n').forEach(l => { const m = l.match(/^── (\d+)\./); if (m) sec = '§' + m[1]; if (/^\s+FAIL/.test(l)) caught.add(sec); });
  console.log((killed ? '  killed   ' : '  SURVIVED ') + label + (killed ? '  — caught by ' + [...caught].join(' ') : ''));
}
console.log(`\n${MUTANTS.length - survivors}/${MUTANTS.length} mutants killed`);
process.exit(survivors ? 1 : 0);
