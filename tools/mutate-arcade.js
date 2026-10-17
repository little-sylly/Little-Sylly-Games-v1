// Mutation runner for tools/verify-arcade.js — breaks each registration seam in
// turn and asserts the harness goes red. A harness nobody has seen fail proves
// nothing. Every file is restored in a finally block.
const fs=require('fs'),cp=require('child_process');
const MUTS=[
 ['js/engine.js','ghost screen: drop screen-arcade-bluff from allScreens[]',
   s=>s.replace("'screen-arcade-bluff',","")],
 ['js/engine.js','teardown regression: back to the single hardcoded resetArcade()',
   s=>s.replace(/if \(typeof SM_ARCADE !== 'undefined'\) \{\n    SM_ARCADE\.forEach\(cab => \{ try \{ cab\.stop\(\); \} catch \(_\) \{\} \}\);\n  \}/,
                "if (typeof resetArcade === 'function') resetArcade();")],
 ['src/screens/_scripts-3.html','missing <script src> for slice.js',
   s=>s.replace('  <script src="js/arcade/slice.js"></script>\n','')],
 ['sw.js','missing precache entry for cookiejar.js (offline-only break)',
   s=>s.replace("  'js/arcade/cookiejar.js',\n","")],
 ['src/screens/_secret.html','missing markup for the stacking cabinet',
   s=>s.replace(/  <!-- \u2550\u2550 ARCADE CABINET 06[\s\S]*?<\/section>\n/,'')],
 ['src/screens/_secret.html','stage loses touch-action:none (browser eats the drag)',
   s=>s.replace('id="bb-stage" class="flex-1 min-h-0 flex items-center justify-center" style="touch-action:none"',
                'id="bb-stage" class="flex-1 min-h-0 flex items-center justify-center"')],
 ['js/secret-mode.js','Konami guard regression: asherplane only',
   s=>s.replace(/if \(SM_ARCADE\.some\(cab => \{[\s\S]*?\}\)\) return;/,
     "if (document.getElementById('screen-arcade-asherplane').style.display !== 'none') return;")],
 ['js/secret-mode.js','registry loses a stop() hook',
   s=>s.replace("start: () => ckStart(),  stop: () => resetArcadeChicken() }","start: () => ckStart() }")],
 ['js/arcade/bluff.js','a cabinet leaks an unprefixed global',
   s=>s.replace('function resetArcadeBluff() {','function drawRock() {}\nfunction resetArcadeBluff() {')],
 ['js/arcade/chicken.js','teardown stops cancelling the RAF loop',
   s=>s.replace('if (ckRaf) { cancelAnimationFrame(ckRaf); ckRaf = null; }','ckRaf = null;')],
 ['js/arcade/minesweeper.js','start() navigates to the wrong screen',
   s=>s.replace("showScreen('screen-arcade-minesweeper')","showScreen('screen-arcade-asherplane')")],
 ['js/arcade/stacking.js','exit button stops tearing its own cabinet down',
   s=>s.replace('resetArcadeStacking(); resetToLobby();','resetToLobby();')],
];
let red=0,green=0;
for(const [f,label,fn] of MUTS){
  const orig=fs.readFileSync(f,'utf8');
  try{
    const mutated=fn(orig);
    if(mutated===orig){console.log(`  ?? NO-OP  ${label}`);green++;continue;}
    fs.writeFileSync(f,mutated,'utf8');
    let code=0;
    try{cp.execSync('node tools/verify-arcade.js',{stdio:'pipe'});}catch(e){code=e.status;}
    if(code!==0){console.log(`  \u2713 RED    ${label}`);red++;}
    else{console.log(`  \u2717 GREEN  ${label}  <-- harness blind to this!`);green++;}
  } finally { fs.writeFileSync(f,orig,'utf8'); }
}
console.log(`\n${red} caught, ${green} missed`);
process.exit(green?1:0);
