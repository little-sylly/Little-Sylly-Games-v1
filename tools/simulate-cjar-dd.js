// ═══════════════════════════════════════════════════════════════════════════
// simulate-cjar-dd.js — balance instrument for Dibber Dobber.
//
//   node tools/simulate-cjar-dd.js [matches] [players]
//   (defaults: 5000 matches, 5 players)
//
// Spec §17 D-11 mitigation. The Sylly balance numbers were simulated at a 16-card
// deck and ship at ~11 (CJAR_DD_CUT 10 + the scheduled Treat). This measures them
// at the REAL deck size before a table ever sees them.
//
// It ASSERTS NOTHING and always exits 0 — a balance reading is a tuning signal,
// not a contract, and a flaky exit code would make the build lie. Read the report.
//
// Unlike the three verify-* tools this one uses real randomness: the distribution
// IS the measurement, so shuffle and Math.random are the genuine article.
//
// What to look at:
//   • Action lean vs the 33% baseline — an archetype nobody plays is a dead rule.
//   • Win-rate spread across the three archetypes — a dominant strategy shows here.
//   • Debt-cap saturation — if seats sit pinned at 6, the cap is too tight.
//   • Treats claimed — the reversed priority is meant to be winnable, not rare.
//
// Treat accounting, deliberately per-TREAT and not per-flip: a Treat sits on the
// counter until someone is uniquely solo, so counting every flip it is visible as an
// "offer" would structurally cap the claim rate near 50% (one Treat per Raid, one
// claim, several flips of exposure) and read as a failure when nothing is wrong.
// "revealed" counts each Treat once, when its card is flipped. Exposure is reported
// separately as its own line.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT     = path.join(__dirname, '..');
const dataJson = fs.readFileSync(path.join(ROOT, 'data/cjar-data.json'), 'utf8');

const MATCHES = parseInt(process.argv[2], 10) || 5000;
const PLAYERS = parseInt(process.argv[3], 10) || 5;

// A real Fisher-Yates, matching engine.js's pure shuffle exactly.
function realShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sandbox = {
  console: { log() {}, warn() {} },              // the plugin is quiet; this tool reports
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(dataJson)) }),
  shuffle: realShuffle,
  showScreen() {},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
  playAlarm() {}, playSuccess() {}, playClashWin() {}, playHullThud() {},
  playAbyssThud() {}, playUnchallenged() {}, playPoacher() {}, playExit() {},
  playPillClick() {}, playSyllyOn() {}, playSyllyOff() {},
  assetFace: () => null, assetBack: () => null,
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__sim = {
  get stashes() { return cjarStashes; },
  get debt()    { return cjarCrumbDebt; },
  get deck()    { return cjarDeck; },
  get card()    { return cjarCard; },
  get treat()   { return cjarCounterTreat; },
  get treatsWon(){ return cjarTreatsWon; },
  get raidNo()  { return cjarRaidNo; },
  get fav()     { return cjarFavourite; },
  get watch()   { return cjarWatcher; },
  setup(n, len) {
    cjarPlayerCount = n;
    cjarPlayerNames = Array.from({ length: n }, (_, i) => 'P' + i);
    cjarSyllyMode = true; cjarMatchLength = len; cjarOpenBook = true;
  },
  // Delta 7's two halves. The simulator drives them in the real order — open a blind
  // window, choose, THEN reveal — rather than going through cjarHostNextFlip, because
  // the host driver chains through setTimeout and this sandbox never fires timers.
  openBlind() { cjarOpenBlindWindow(); },
  reveal()    { return cjarRevealSyllyCard(); },
  ranks() { return cjarRanks(); },
};`;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/cjar.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/cjar.js' });

// ── Three archetypes, one per lean. Each is a plausible table personality, not an
//    optimal solver — the question is whether any lean runs away with the game.
const ARCHETYPES = {
  greedy:   { label: 'Take-leaning',     weights: { take: 0.60, innocent: 0.25, dob: 0.15 } },
  cautious: { label: 'Innocent-leaning', weights: { take: 0.20, innocent: 0.65, dob: 0.15 } },
  snitch:   { label: 'Dob-leaning',      weights: { take: 0.25, innocent: 0.30, dob: 0.45 } },
};
const NAMES = Object.keys(ARCHETYPES);

function pick(weights) {
  const r = Math.random();
  let acc = 0;
  for (const k of ['take', 'innocent', 'dob']) { acc += weights[k]; if (r < acc) return k; }
  return 'innocent';
}

(async () => {
  await sandbox.cjarLoadData();
  const S = sandbox.__sim;

  const wins       = Object.fromEntries(NAMES.map(n => [n, 0]));
  const seats      = Object.fromEntries(NAMES.map(n => [n, 0]));
  const cookiesEnd = Object.fromEntries(NAMES.map(n => [n, 0]));
  const actions    = { take: 0, innocent: 0, dob: 0 };
  let debtTicks = 0, debtCapped = 0, flips = 0, deckSizes = [];
  let treatsRevealed = 0, treatsClaimed = 0, treatFlips = 0;

  for (let m = 0; m < MATCHES; m++) {
    // Rotate the archetype assignment so seat order never biases the result.
    const assign = Array.from({ length: PLAYERS }, (_, i) => NAMES[(i + m) % NAMES.length]);
    assign.forEach(a => { seats[a]++; });

    S.setup(PLAYERS, 5);
    sandbox.cjarStartMatch();

    for (let raid = 1; raid <= 5; raid++) {
      if (raid > 1) sandbox.cjarStartRaid();
      deckSizes.push(S.deck.length);
      let guard = 0;
      while (guard++ < 60) {
        if (!S.deck.length) break;
        S.openBlind();
        // Chosen BLIND, before the card exists — the agents were always card-blind
        // (pick() takes weights only), so Delta 7 changed the game's structure to
        // match what this instrument was already measuring. The baseline carries over.
        const choices = assign.map(a => {
          const c = pick(ARCHETYPES[a].weights);
          actions[c]++;
          return c;
        });
        const card = S.reveal();
        if (!card) break;
        // Counted once per Treat, at the flip that reveals it — see the header note.
        if (card.type === 'treat') treatsRevealed++;
        // Read AFTER the reveal: a Treat is claimable on the flip it appears (spec
        // §809), as well as on any later flip while it sits unclaimed.
        const hadTreat = !!S.treat;
        if (hadTreat) treatFlips++;
        flips++;
        const res = sandbox.cjarResolveFlip(choices);
        if (hadTreat && !S.treat) treatsClaimed++;
        S.debt.forEach(d => { if (d > 0) debtTicks++; if (d >= 6) debtCapped++; });
        if (res.raidEnded) break;
      }
      sandbox.cjarEndRaid('deckout');
    }

    const ranks = S.ranks();
    const best  = Math.min(...ranks);
    ranks.forEach((r, i) => { if (r === best) wins[assign[i]] += 1 / ranks.filter(x => x === best).length; });
    S.stashes.forEach((s, i) => { cookiesEnd[assign[i]] += s; });
  }

  const pct = (n, d) => d ? (100 * n / d).toFixed(1) + '%' : '—';
  const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  const totalActions = actions.take + actions.innocent + actions.dob;

  console.log('Cookie Jar — Dibber Dobber balance simulation');
  console.log('='.repeat(58));
  console.log(`matches ${MATCHES}   players ${PLAYERS}   flips ${flips}`);
  console.log(`mean deck size ${avg(deckSizes)}  (spec target ~11: CJAR_DD_CUT 10 + 1 Treat)`);

  console.log('\nAction lean across all seats (baseline 33.3% each)');
  for (const k of ['take', 'innocent', 'dob']) {
    console.log(`  ${k.padEnd(9)} ${pct(actions[k], totalActions)}`);
  }

  console.log('\nWin rate by archetype (baseline ' + pct(1, NAMES.length) + ')');
  for (const n of NAMES) {
    console.log(`  ${ARCHETYPES[n].label.padEnd(18)} ${pct(wins[n], MATCHES).padStart(6)}` +
                `   mean final Cookie Stash ${(cookiesEnd[n] / seats[n]).toFixed(1)}`);
  }
  const rates = NAMES.map(n => wins[n] / MATCHES);
  console.log(`  spread (max − min): ${((Math.max(...rates) - Math.min(...rates)) * 100).toFixed(1)} pts`);

  console.log('\nCrumb Debt');
  console.log(`  seat-flips in debt      ${pct(debtTicks, flips * PLAYERS)}`);
  console.log(`  of those, pinned at cap ${pct(debtCapped, debtTicks)}   (CJAR_DD_DEBT_CAP = 6)`);

  console.log('\nTreats');
  console.log(`  revealed ${treatsRevealed}   claimed ${treatsClaimed}   (${pct(treatsClaimed, treatsRevealed)} of Treats)`);
  console.log(`  exposure: ${treatFlips} flips had a Treat on the counter (${pct(treatFlips, flips)} of flips)`);

  console.log('\nReading this report');
  console.log('  • Win-rate spread above ~12 pts suggests a dominant lean — retune before playtest.');
  console.log('  • Debt pinned at the cap above ~25% means CJAR_DD_DEBT_CAP is too tight.');
  console.log('  • Treats claimed below ~40% means the reversed priority is too hard to hit.');
  console.log('  • This tool asserts nothing. It always exits 0. Read the numbers.');
})();
