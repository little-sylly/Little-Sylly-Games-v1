const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(filePath, 'utf8');

const old = `One member of <span class="font-semibold text-stone-700">The Gang</span> secretly has a decoy location. They want the <span class="font-semibold text-stone-700">Friend of a Friend</span> to pin the wrong spot. Three-way scoring: Friend of a Friend, The Gang, and The Troublemaker each have different win conditions.`;
const neu = `One member of <span class="font-semibold text-stone-700">The Gang</span> secretly knows the real location and holds 2 decoy locations. They want the <span class="font-semibold text-stone-700">Friend of a Friend</span> to pin a decoy instead. Three-way scoring: Friend of a Friend, The Gang, and The Troublemaker each have different win conditions.`;

if (!html.includes(old)) { console.error('String not found'); process.exit(1); }
html = html.replace(old, neu);
fs.writeFileSync(filePath, html, 'utf8');
console.log('Done.');
