#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// verify-eta-content.js — data/eta-data.json against the ETA? content rules
// (docs/eta-content-guide.md; spec docs/new-game-tech-eta.md §10). Run it after
// ANY content edit — every distance and speed is a graded answer.
//   node tools/verify-eta-content.js [path/to/eta-data.json]
// Uses the REAL pairing functions from js/games/eta.js, so "eligible" here means
// exactly what the game's deal means.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FILE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'data/eta-data.json');
const D = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const sb = { console, Math, JSON, Number, String, Array, Object, Set, Promise, isFinite, setTimeout() {}, clearTimeout() {},
  document: { getElementById: () => null, querySelectorAll: () => [], addEventListener() {} }, mpPlayerSlots: [] };
sb.window = sb;
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/eta-scene.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/eta.js'), 'utf8'), sb);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const MODES = ['land', 'sea', 'air', 'space'], TIERS = ['local', 'geo', 'astro'];
const rideTiers = new Set((D.rideTiers || []).map(t => t.id));

console.log(`verify-eta-content — ${path.relative(ROOT, FILE)}${D.provisional ? ' (PROVISIONAL set)' : ''}`);
ok(D.window && D.window.minMinutes > 0 && D.window.maxMinutes > D.window.minMinutes, 'the answerable window is set');
const ids = new Set();
(D.routes || []).forEach(r => {
  const t = `route ${r.id}`;
  ok(r.id && !ids.has(r.id), `${t}: unique id`); ids.add(r.id);
  ok(typeof r.headline === 'string' && r.headline.length > 3, `${t}: headline`);
  ok(r.km > 0 && isFinite(r.km), `${t}: a positive distance`);
  ok(TIERS.includes(r.tier), `${t}: tier is local / geo / astro`);
  ok(Array.isArray(r.briefing) && r.briefing.length > 0, `${t}: at least one Briefing line (the corridor assumption)`);
  ok(!r.limitKmh || r.limitKmh > 0, `${t}: a speed limit, if any, is positive`);
});
const kms = (D.routes || []).filter(r => !r.offMap).map(r => r.km);
ok(new Set(kms).size === kms.length, 'no two real Routes share a distance (the old 100 km twice)');
(D.rides || []).forEach(d => {
  const t = `ride ${d.id}`;
  ok(d.id && !ids.has(d.id), `${t}: unique id`); ids.add(d.id);
  ok(MODES.includes(d.mode), `${t}: mode is land / sea / air / space`);
  ok(rideTiers.has(d.tier), `${t}: tier is listed in rideTiers`);
  ok(d.cruise > 0 && isFinite(d.cruise), `${t}: a finite, positive cruising speed`);
  ok(d.max == null || d.max >= d.cruise, `${t}: a maximum, if any, is at least the cruise`);
  ok(typeof d.reveal === 'string' && d.reveal.length > 5, `${t}: a reveal line`);
  ok(!d.unregistered || (typeof d.hint === 'string' && d.hint.length > 5), `${t}: an Unregistered Ride carries its Briefing hint`);
  ok(!!d.unregistered === (d.tier === 'unreg'), `${t}: tier 'unreg' if and only if Unregistered`);
});
// Every Route must deal a full 8-courier table, in both modes, across ≥ 3 registered tiers.
(D.routes || []).forEach(r => [false, true].forEach(sylly => {
  ok(sb.etaRouteOk(D, r, 8, sylly), `route ${r.id}: ≥ 8 eligible Rides across ≥ 3 tiers (${sylly ? 'Sylly' : 'Standard'})`);
}));
// A 7-Run Shift never runs dry in any Range.
['local', 'all'].forEach(range => {
  const n = (D.routes || []).filter(r => !r.offMap && sb.etaRangeHas(range, r)).length;
  ok(n >= 7, `${range}: at least 7 real Routes (has ${n})`);
});
ok((D.routes || []).some(r => r.offMap), 'at least one Off the Map Route');
ok(((D.quips || {}).dead || []).length && ((D.quips || {}).fast || []).length && ((D.quips || {}).slow || []).length && ((D.quips || {}).close || []).length, 'a quip pool for every verdict');
ok((D.flavour || []).length >= 3, 'at least three docket flavour lines');
// **bold** marks the Briefing's load-bearing words (content guide § Briefing): markers pair up,
// never wrap nothing, and every Briefing line and hint bolds something.
const brief = [].concat(...(D.routes || []).map(r => r.briefing || []), (D.rides || []).filter(d => d.hint).map(d => d.hint));
const badMark = [...new Set(brief)].filter(l => ((l.match(/\*\*/g) || []).length % 2) || /\*\*\s*\*\*/.test(l));
ok(!badMark.length, 'every **bold** marker in a Briefing line or hint pairs up', badMark);
const unbold = [...new Set((D.routes || []).map(r => (r.briefing || []).join(' ')))].filter(l => !/\*\*[^*]+\*\*/.test(l));
ok(!unbold.length, "every Route's Briefing bolds its load-bearing words", unbold);

// The KM / MI chip (SW v276): every headline, Briefing line and hint must convert with no metric
// left over and no NaN — a unit the converter doesn't know ("metres", "km/hr") would leak through.
const shown = [...new Set([].concat(...(D.routes || []).map(r => [r.headline, ...(r.briefing || [])]), (D.rides || []).filter(d => d.hint).map(d => d.hint)))];
const leak = shown.map(l => sb.etaImperial(l)).filter(l => /\d\s?(km|m|cm|mm|metres?|kilometres?)\b|km\/h|kph|NaN/i.test(l));
ok(!leak.length, 'every content string converts to miles with no metric left over (write units as km, km/h, m, cm, mm)', leak);
ok(sb.etaImperial('**held to 60 km/h**') === '**held to 37.3 mph**' && sb.etaImperial('a million kilometres') === '621,000 miles', 'the converter keeps **bold** and re-scales million/billion');

console.log(`\n${fail ? `FAILED — ${fail} check(s)` : 'ALL CHECKS PASSED'} (${pass} passed)`);
process.exit(fail ? 1 : 0);
