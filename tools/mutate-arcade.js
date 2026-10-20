// Mutation runner for tools/verify-arcade.js — breaks each registration seam in
// turn and asserts the harness goes red. A harness nobody has seen fail proves
// nothing. Every file is restored in a finally block.
const fs=require('fs'),cp=require('child_process');
const MUTS=[
 ['js/engine.js','ghost screen: drop screen-arcade-bluff from allScreens[]',
   s=>s.replace("'screen-arcade-bluff',","")],
 ['js/engine.js','teardown regression: back to the single hardcoded resetArcade()',
   s=>s.replace(/if \(typeof ARC_CABINETS !== 'undefined'\) \{\n    ARC_CABINETS\.forEach\(cab => \{ try \{ cab\.stop\(\); \} catch \(_\) \{\} \}\);\n  \}/,
                "if (typeof resetArcade === 'function') resetArcade();")],
 ['src/screens/_scripts-3.html','missing <script src> for slice.js',
   s=>s.replace('  <script src="js/arcade/slice.js"></script>\n','')],
 ['sw.js','missing precache entry for cookiejar.js (offline-only break)',
   s=>s.replace("  'js/arcade/cookiejar.js',\n","")],
 ['src/screens/arcade.html','missing markup for the stacking cabinet',
   s=>s.replace(/  <!-- \u2550\u2550 ARCADE CABINET 06[\s\S]*?<\/section>\n/,'')],
 ['src/screens/arcade.html','stage loses touch-action:none (browser eats the drag)',
   s=>s.replace('id="bb-stage" class="flex-1 min-h-0 flex items-center justify-center" style="touch-action:none"',
                'id="bb-stage" class="flex-1 min-h-0 flex items-center justify-center"')],
 ['js/secret-mode.js','Konami guard regression: asherplane only',
   s=>s.replace(/if \(\['screen-arcade'\]\.concat\(ARC_CABINETS[\s\S]*?\}\)\) return;/,
     "if (document.getElementById('screen-arcade-asherplane').style.display !== 'none') return;")],
 ['js/lobby/arcade.js','registry loses a stop() hook',
   s=>s.replace("start: () => ckStart(),  stop: () => resetArcadeChicken(),","start: () => ckStart(),")],
 ['js/arcade/bluff.js','a cabinet leaks an unprefixed global',
   s=>s.replace('function resetArcadeBluff() {','function drawRock() {}\nfunction resetArcadeBluff() {')],
 ['js/arcade/chicken.js','teardown stops cancelling the RAF loop',
   s=>s.replace('if (ckRaf) { cancelAnimationFrame(ckRaf); ckRaf = null; }','ckRaf = null;')],
 ['js/arcade/minesweeper.js','start() navigates to the wrong screen',
   s=>s.replace("showScreen('screen-arcade-minesweeper')","showScreen('screen-arcade-asherplane')")],
 ['js/arcade/stacking.js','exit button stops tearing its own cabinet down',
   s=>s.replace('resetArcadeStacking(); arcExitCabinet();','arcExitCabinet();')],
 ['js/secret-mode.js','Konami guard forgets the room (its arrows feed the buffer)',
   s=>s.replace("['screen-arcade'].concat(ARC_CABINETS.map(cab => cab.screen))","ARC_CABINETS.map(cab => cab.screen)")],
 ['js/lobby/arcade.js',"a cabinet's exit stops only itself",
   s=>s.replace("ARC_CABINETS.forEach(cab => { try { cab.stop(); } catch (_) {} });\n  arcOpen();","arcOpen();")],
 ['js/secret-mode.js','the old sticky unlock creeps back',
   s=>s.replace('smUpdateProgress();\n    smOpenGateway();','smUpdateProgress();\n    smArcadeUnlocked = true;\n    smOpenGateway();')],
 ['js/engine.js','resetToLobby() forgets the launch beat',
   s=>s.replace("  if (typeof arcStop === 'function') arcStop();",'')],
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
