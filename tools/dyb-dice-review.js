// ═══════════════════════════════════════════════════════════════════════════
// dyb-dice-review.js — writes a SELF-CONTAINED review page of every procedural
// dice set (built-in + skin packs), every tint, the five Tempest forms, the cup
// and a rolling cube to wip/dyb-dice-review.html (wip/ is git-ignored).
//
//   node tools/dyb-dice-review.js      then open wip/dyb-dice-review.html
//
// Inlines css/styles.css and js/games/dyb-dice.js, so it works from file://.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const css  = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');
const dice = fs.readFileSync(path.join(ROOT, 'js/games/dyb-dice.js'), 'utf8');
const reg  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/packs/registry.json'), 'utf8'));
const packSets = reg.map(id => JSON.parse(fs.readFileSync(path.join(ROOT, `data/packs/${id}/pack.json`), 'utf8')))
  .filter(m => m.assets && m.assets.kind === 'dyb').map(m => m.assets.diceSet);

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Bluff dice review</title>
<style>${css}
body{background:#F4EFE7;color:#44382c;font-family:system-ui,sans-serif;padding:16px;max-width:760px;margin:0 auto}
h1{font-size:20px;font-weight:700} h2{font-size:15px;font-weight:700;margin:22px 0 8px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end} .cell{display:flex;flex-direction:column;align-items:center;gap:4px}

.cap{font-size:11px;color:#8a7866} button{padding:8px 14px;border-radius:12px;background:#6B5744;color:#fff;font-weight:600}
</style></head><body>
<h1>The Bluff — procedural dice review</h1>
<p class="cap">Every set × tint, the Tempest forms, the cup, and the throw. <button id="roll">Roll the cubes</button></p>
<div id="out"></div>
<script>${dice}</script>
<script>
const PACKS = ${JSON.stringify(packSets)};
const sets = [DYB_DICE_SETS.rocky, DYB_DICE_SETS.classic, ...PACKS.filter(p => p.id !== 'classic')];
const out = document.getElementById('out');
const cell = (html, cap) => '<div class="cell">' + html + '<span class="cap">' + cap + '</span></div>';
let h = '';
sets.forEach(s => {
  h += '<h2>' + s.label + ' — ' + s.finish + ', ' + s.pip + ' pips</h2><div class="row">';
  s.tints.forEach((t, i) => { h += cell(dybDieMarkup(dybDieRecipe({ set: s, tint: i, face: 5 }), 48), t.name); });
  h += cell(dybCupMarkup(s).replace('style="', 'style="position:relative;left:0;top:0;margin:0;width:60px;height:68px;'), 'cup');
  h += '</div><div class="row" style="margin-top:8px">';
  [1, 2, 3, 4, 5, 6].forEach(f => { h += cell(dybDieMarkup(dybDieRecipe({ set: s, tint: 1, face: f }), 40), String(f)); });
  h += '</div>';
});
h += '<h2>The Tempest — forms on Rocky, sandstone and slate</h2>';
[1, 5].forEach(tint => {
  h += '<div class="row">';
  [['loaded', {}], ['cracked', {}], ['snake', {}], ['slick', { state: 'unpicked' }], ['phantom', { state: 'concealed' }], ['phantom', { secondary: 'loaded' }]]
    .forEach(([type, extra]) => {
      const cap = type === 'phantom' ? (extra.state ? 'phantom (hidden)' : 'phantom revealed + loaded') : (extra.state ? 'slick (unpicked)' : type);
      h += cell(dybDieMarkup(dybDieRecipe(Object.assign({ set: DYB_DICE_SETS.rocky, tint, face: 4, type }, extra)), 56), cap);
    });
  h += '</div>';
});
h += '<h2>The throw — each cube should land on the number under it</h2><div class="row" id="cubes">';
[1, 2, 3, 4, 5, 6].forEach(f => { h += cell(dybCubeMarkup(x => dybDieRecipe({ set: DYB_DICE_SETS.rocky, tint: 2, face: x }), f, 52), 'should show ' + f); });
h += '</div>';
out.innerHTML = h;
const roll = () => document.querySelectorAll('#cubes .dyb-cube').forEach((c, i) => dybRollCube(c, 1000, i * 7 + 3));
document.getElementById('roll').onclick = roll; setTimeout(roll, 300);
</script></body></html>`;

fs.mkdirSync(path.join(ROOT, 'wip'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'wip/dyb-dice-review.html'), page);
console.log('wrote wip/dyb-dice-review.html');
