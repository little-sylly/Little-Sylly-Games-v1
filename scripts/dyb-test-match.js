const fs = require('fs');
const html = fs.readFileSync('d:/Coding Projects/Little-Sylly-Games/index.html', 'utf8');

const needle = `      <div id="dyb-shake-cup-area" class="flex flex-col items-center gap-4 cursor-pointer active:scale-95 transition-transform duration-150 px-8 py-6 rounded-3xl bg-stone-100" role="button">
        <div id="dyb-hand-dock-shake" class="flex gap-3 flex-wrap justify-center"></div>
        <p id="dyb-shake-cup-label" class="text-stone-400 text-sm font-semibold">Tap to shake 'em up</p>
      </div>`;

console.log('Needle found:', html.includes(needle));
console.log('Needle JSON:', JSON.stringify(needle).substring(0, 300));

// Also test if it was already replaced:
console.log('\nAlready has btn-dyb-tempest-guide:', html.includes('btn-dyb-tempest-guide'));
console.log('Has px-8 in cup area:', html.includes('px-8 py-6 rounded-3xl bg-stone-100'));
