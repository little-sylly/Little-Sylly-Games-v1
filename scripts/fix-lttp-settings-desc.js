const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(filePath, 'utf8');

const old = `<p class="text-stone-400 text-sm">One Gang member secretly has a decoy location to plant. If the Friend of a Friend pins the decoy, The Troublemaker scores big instead.</p>`;
const neu = `<p class="text-stone-400 text-sm">One Gang member knows the real location and holds 2 decoys to plant. If the Friend of a Friend pins one, The Troublemaker scores big instead.</p>`;

if (!html.includes(old)) { console.error('String not found'); process.exit(1); }
html = html.replace(old, neu);
fs.writeFileSync(filePath, html, 'utf8');
console.log('Done.');
