// ═══════════════════════════════════════════════════════════════════════════
// verify-tv-labels.js — R12 of the UI revamp (docs/rules/ui-revamp.md § 5).
//
//   node tools/verify-tv-labels.js        (exits 1 on any failure)
//
// TV host-spectator mode does not exist yet; every revamped game leaves it a
// foothold. For each game whose row in docs/ui-revamp-rollout.md § 3 is ✅:
//   • every <section id="screen-…"> in its partial(s) carries data-tv="public|private"
//   • its docs/code-map.md section names its public state:
//       **TV public state (abbr):** field, field, …
// The engine-owned screen-game-intro is checked always. The checker also runs on
// fixtures, so it proves it can fire while no game is revamped.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0, total = 0;
function ok(label, cond, detail) {
  total++;
  if (cond) console.log('  ok    ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? '\n          ' + detail : '')); }
}
const section = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)));

// Every screen opening tag → its id and its data-tv value (or null). Any of the three
// tags a screen uses (LI5's menu is a <main>).
function screensOf(html) {
  const out = [];
  const re = /<(?:section|main|div)\b[^>]*\bid="(screen-[^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const tv = /\bdata-tv="([^"]*)"/.exec(m[0]);
    out.push({ id: m[1], tv: tv ? tv[1] : null });
  }
  return out;
}
const unlabelled = html => screensOf(html).filter(s => s.tv !== 'public' && s.tv !== 'private');

// The tracker's ✅ rows: the Game cell starts **ABBR**; the Status column is found by name.
function revampedGames(md) {
  const rows = md.split(/\r?\n/).filter(l => /^\|/.test(l));
  const head = rows.find(l => /\|\s*Status\s*\|/.test(l));
  if (!head) return null;
  const cells = l => l.split('|').slice(1, -1).map(c => c.trim());
  const hi = cells(head);
  const gi = hi.indexOf('Game'), si = hi.indexOf('Status');
  return rows.filter(l => l !== head && !/^\|[\s:|-]+\|$/.test(l))
    .map(cells)
    .filter(c => c.length === hi.length && /^\*\*[A-Z0-9]+\*\*/.test(c[gi] || ''))
    .filter(c => (c[si] || '').includes('✅'))
    .map(c => c[gi].match(/^\*\*([A-Z0-9]+)\*\*/)[1].toLowerCase());
}

// A game's partials: src/screens/[abbr].html plus any [abbr]-*.html (gm-overlays.html).
function partialsOf(abbr) {
  return fs.readdirSync(path.join(ROOT, 'src/screens'))
    .filter(f => f === abbr + '.html' || f.startsWith(abbr + '-'))
    .map(f => 'src/screens/' + f);
}

console.log('verify-tv-labels — R12, data-tv on every screen of every revamped game');
console.log('='.repeat(70));

section('1. The checker fires (fixtures)');
ok('a labelled screen passes', unlabelled('<section id="screen-x-a" data-tv="public" style="">').length === 0);
ok('a screen with no label is caught', unlabelled('<section id="screen-x-b" class="flex">').length === 1);
ok('a label that is neither public nor private is caught', unlabelled('<section id="screen-x-c" data-tv="maybe">').length === 1);
ok('a non-screen section is ignored', screensOf('<section id="lobby-strip">').length === 0);
ok('a <main> screen is seen too', unlabelled('<main id="screen-menu" class="flex">').length === 1);
{
  const md = '| Order | Game | Stage | Status | Next |\n|---:|---|---|:---:|---|\n' +
             '| 1 | **AAA** One | 1 | ✅ | — |\n| 2 | **BBB** Two | 2 | 🔨 | — |\n| — | *TBD* | 3 | ☐ | — |';
  const g = revampedGames(md);
  ok('the tracker parser reads only the ✅ rows', JSON.stringify(g) === '["aaa"]', JSON.stringify(g));
}

section('2. The engine\'s own Intro screen');
{
  const shell = read('src/screens/_shell.html');
  const intro = screensOf(shell).find(s => s.id === 'screen-game-intro');
  ok('screen-game-intro exists', !!intro);
  ok('  …and is labelled private (a brief can name a seat\'s role)', intro && intro.tv === 'private', intro && String(intro.tv));
}

section('3. Every revamped game (the tracker\'s ✅ rows)');
{
  const games = revampedGames(read('docs/ui-revamp-rollout.md'));
  ok('the tracker has a Status column', Array.isArray(games));
  const codeMap = read('docs/code-map.md');
  if (games && games.length === 0) console.log('  note  no game is revamped yet — nothing to check (Stage 0)');
  for (const abbr of games || []) {
    const files = partialsOf(abbr);
    ok(abbr + ': has a partial in src/screens/', files.length > 0);
    for (const f of files) {
      const bad = unlabelled(read(f));
      ok(abbr + ': every screen in ' + path.basename(f) + ' carries data-tv', bad.length === 0, bad.map(s => s.id).join(', '));
    }
    // …and its screens that live in a shared partial (screen-li5-monitor is in _mp.html).
    const elsewhere = fs.readdirSync(path.join(ROOT, 'src/screens')).filter(f => f.startsWith('_'))
      .flatMap(f => unlabelled(read('src/screens/' + f)).filter(s => s.id.startsWith('screen-' + abbr + '-')));
    ok(abbr + ': its screens in shared partials carry data-tv too', elsewhere.length === 0, elsewhere.map(s => s.id).join(', '));
    ok(abbr + ': code-map.md names its TV public state',
       new RegExp('\\*\\*TV public state \\(' + abbr + '\\):\\*\\*').test(codeMap));
  }
}

console.log('\n' + '='.repeat(70));
console.log(failures ? `${failures} of ${total} CHECKS FAILED` : `ALL ${total} CHECKS PASSED`);
process.exit(failures ? 1 : 0);
