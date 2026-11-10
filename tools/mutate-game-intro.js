// ═══════════════════════════════════════════════════════════════════════════
// mutate-game-intro.js — the INTRO_SRC= broken-copy runs (UI revamp spec § 12).
// Each mutant reverts ONE load-bearing line in a temp copy of js/engine-intro.js
// (or, marked 'mp', of js/engine-multiplayer.js — the seam) and drives
// tools/verify-game-intro.js against it. Every mutant must turn the loopback RED;
// a green run is a survivor — a line the loopback does not actually watch.
//
//   node tools/mutate-game-intro.js     (exits 1 if any mutant survives)
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
// LF-normalised: core.autocrlf is on in this repo; multi-line anchors would read STALE otherwise.
const SRC = {
  intro: fs.readFileSync(path.join(ROOT, 'js/engine-intro.js'), 'utf8').replace(/\r\n/g, '\n'),
  mp:    fs.readFileSync(path.join(ROOT, 'js/engine-multiplayer.js'), 'utf8').replace(/\r\n/g, '\n'),
};

const MUTANTS = [
  // ── the Intro module ──
  ['the host marks its OWN ready slot (not a self-sent ACTION)', 'intro',
   "    mpIntro.state.ready[mpMyPlayerIdx] = true;\n    mpIntroBroadcast();",
   "    mpSendEnvelope({ type: 'ACTION', payload: { action: 'MP_INTRO_READY' } });"],
  ['the seat comes from originId, never the payload', 'intro',
   'const seat = mpIntroSeatOf(env.originId);', 'const seat = Number(p.playerIdx ?? mpIntroSeatOf(env.originId));'],
  ['a bot is pre-ready', 'intro', 'ready:   mpPlayerSlots.map(s => mpIsBotSlot(s)),', 'ready:   mpPlayerSlots.map(() => false),'],
  ['Start anyway never waives a Line-up rule', 'intro', '  if (mpIntroProblem()) return false;\n', ''],
  ['Start never warns about unconfirmed players', 'intro', 'const n = mpIntro && mpIntro.state ? mpIntro.state.ready.filter(r => !r).length : 0;', 'const n = 0;'],
  ['Start never offers auto-assign for players without a team', 'intro', '  if (unplaced) {', '  if (false) {'],
  ['Start waits on a dropped seat', 'intro', '  if (mpAwaySeats.size) return false;\n', ''],
  ['a client sends Ready once', 'intro', '    if (mpIntro.readySent) return;\n', ''],
  ['a team that does not exist is refused', 'intro',
   'if (!mpIntro.lineup || !mpIntroValidTeam(team)) return true;', 'if (!mpIntro.lineup) return true;'],
  ['the roster is rebuilt on receipt (Firebase erased captainSlots)', 'intro',
   'window.mpLobbyRoster = mpIntroWireRoster(p.roster, slots.length);', 'window.mpLobbyRoster = p.roster;'],
  ['the seat freeze moves to MP_INTRO_DONE', 'intro', '  mpIntroRefreeze(uids);\n', ''],
  ['Play again skips the beats', 'intro', '      skipped: returning,', '      skipped: false,'],
  ['Play again keeps last match\'s teams', 'intro', '    mpIntroLastTeams = last;\n', ''],
  ['resetToLobby forgets the Play-again flag', 'intro', '  mpIntroSeen = null;\n  mpIntroLastTeams = null;', '  mpIntroLastTeams = null;'],
  ['leaving the screen stops the scene', 'intro', '  mpIntroTimers = [];\n  mpIntroStopScene();', '  mpIntroTimers = [];'],
  ['a returning game with no Line-up goes straight in', 'intro',
   '    if (returning && !lineup) { mpIntroFinishHost(); return; }\n', ''],
  ['the brief may vary by team', 'intro', 'key = cfg.intro.brief(mpMyPlayerIdx, myTeam)', 'key = cfg.intro.brief(mpMyPlayerIdx, -1)'],
  // ── the scene beat hook + TLM (LI5 pilot S0, spec § 4.4) ──
  ['the beats end with beat(-1) — the board settles', 'intro',
   '    if (it.sceneBeat !== want) {', '    if (it.sceneBeat !== want && want >= 0) {'],
  ['beat is state, not an event — sent only on change', 'intro',
   '    if (it.sceneBeat !== want) {', '    if (true) {'],
  ['no Line-up in a Team Lobby', 'intro',
   "(mode !== 'ptp' && window.mpLobbyStyle !== 'team' && cfg.intro.lineup", "(mode !== 'ptp' && cfg.intro.lineup"],
  // ── the roll-call skin hooks (ETA, SW v272) ──
  ['a ready-tag stamps the ready chip', 'intro', '    : tag ? `<span class="intro-chip-stamp"', '    : false ? `<span class="intro-chip-stamp"'],
  ['the roll call shows its heading', 'intro', "  const head = mpIntro.copy && mpIntro.copy.rollPrompt", "  const head = false && mpIntro.copy.rollPrompt"],
  // ── the seam, in engine-multiplayer.js ──
  ['a client enters through the seam on GAME_START', 'mp',
   '      // first, for a game that has one)\n      mpEnterGame(mpActiveGameConfig);',
   '      // first, for a game that has one)\n      mpActiveGameConfig.onPassThePhone();'],
  ['the host enters through the seam after the roster', 'mp',
   '    if (mpMyPlayerIdx < 0) mpMyPlayerIdx = 0; // safety fallback\n    mpEnterGame(mpActiveGameConfig);',
   '    if (mpMyPlayerIdx < 0) mpMyPlayerIdx = 0; // safety fallback\n    mpActiveGameConfig.onPassThePhone();'],
  ['Intro packets route before per-game code', 'mp',
   "  if (typeof mpIntroHandleEnvelope === 'function' && mpIntroHandleEnvelope(env)) return;\n", ''],
  ['a rejoin mid-Intro gets the Intro, not a game snapshot', 'mp', '  if (inIntro) {\n    mpCancelAwayPending(idx);', '  if (false) {\n    mpCancelAwayPending(idx);'],
  ['no game is paused mid-Intro', 'mp', "if (rc) { if (!mpInIntro()) { try { rc.pause();", "if (rc) { if (true) { try { rc.pause();"],
  ['mpReturnToLobby flags Play again', 'mp',
   "    if (typeof mpIntroNoteReturning === 'function') mpIntroNoteReturning(mpActiveGame);\n", ''],
];

let survivors = 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intromut-'));
for (const [label, which, from, to] of MUTANTS) {
  if (!SRC[which].includes(from)) { console.log('  STALE  ' + label + ' — anchor not found; update this mutant'); survivors++; continue; }
  const file = path.join(tmp, which === 'mp' ? 'engine-multiplayer.js' : 'engine-intro.js');
  fs.writeFileSync(file, SRC[which].replace(from, to));
  const env = Object.assign({}, process.env, which === 'mp' ? { MP_SRC: file } : { INTRO_SRC: file });
  const r = spawnSync(process.execPath, [path.join(__dirname, 'verify-game-intro.js')], { env, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const killed = r.status !== 0 && /CHECKS FAILED/.test(out);
  if (!killed) survivors++;
  console.log((killed ? '  killed ' : '  SURVIVED ') + label);
}
console.log(`\n${MUTANTS.length - survivors}/${MUTANTS.length} mutants killed`);
process.exit(survivors ? 1 : 0);
