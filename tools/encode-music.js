/* encode-music.js — turn the jukebox's master mp3s into what the app ships.

       node tools/encode-music.js [--catalogue data/music/jukebox/manifest.json] [--force]

   For every track in the catalogue it reads the MASTER (catalogue `master` + `masterDir`,
   never modified) and writes, into data/music/jukebox/:
     <id>.mp3         128 kbps stereo (logic-engine.md § Background music), no embedded art,
                      no stray tags except title + artist
     covers/<id>.jpg  the master's embedded cover, 400 px square, JPEG
   then points the catalogue's `file` / `cover` at them.

   Why extract: the masters carry their cover INSIDE the mp3 — mostly 1024 px PNGs of ~2 MB,
   ~40% of every file — and a browser's <audio> never shows it anyway. Out of the file it is a
   ~40 KB image the page can use; in the file it is 2 MB a player downloads to hear music.

   Needs ffmpeg + ffprobe: on PATH, or FFMPEG_DIR=<folder holding both>. A dev tool, like the
   tools/verify-* harnesses — not a build step; its output is committed like any other asset.
   Skips a track whose outputs are newer than its master, unless --force. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'music', 'jukebox');
const COVER_PX = 400, COVER_Q = 4, BITRATE = '128k';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const CAT = path.resolve(ROOT, arg('--catalogue', 'data/music/jukebox/manifest.json'));
const FORCE = process.argv.includes('--force');

function findTool(name) {
  const exe = process.platform === 'win32' ? name + '.exe' : name;
  const dirs = [process.env.FFMPEG_DIR].concat((process.env.PATH || '').split(path.delimiter));
  const wg = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(wg)) fs.readdirSync(wg).filter(d => /ffmpeg/i.test(d)).forEach(d => {
    const walk = p => { try { fs.readdirSync(p, { withFileTypes: true }).forEach(e => { const q = path.join(p, e.name); if (e.isDirectory()) walk(q); else if (e.name === exe) dirs.push(p); }); } catch (_) {} };
    walk(path.join(wg, d));
  });
  for (const d of dirs) if (d && fs.existsSync(path.join(d, exe))) return path.join(d, exe);
  console.error(`${name} not found — install ffmpeg, or set FFMPEG_DIR.`); process.exit(1);
}
const FFMPEG = findTool('ffmpeg'), FFPROBE = findTool('ffprobe');
const run = (bin, args) => execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
const masterDir = path.resolve(path.dirname(CAT), cat.masterDir || cat.base);
fs.mkdirSync(path.join(OUT, 'covers'), { recursive: true });

let before = 0, after = 0, covers = 0;
const kb = n => (n / 1024).toFixed(0).padStart(6) + ' KB';
for (const t of cat.tracks) {
  const master = path.join(masterDir, t.master || t.file);
  if (!fs.existsSync(master)) { console.error('missing master: ' + master); process.exitCode = 1; continue; }
  const mp3 = path.join(OUT, t.id + '.mp3'), jpg = path.join(OUT, 'covers', t.id + '.jpg');
  const fresh = f => fs.existsSync(f) && fs.statSync(f).mtimeMs >= fs.statSync(master).mtimeMs;
  const hasArt = run(FFPROBE, ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=index', '-of', 'csv=p=0', master]).trim() !== '';

  if (FORCE || !fresh(mp3)) {
    run(FFMPEG, ['-v', 'error', '-y', '-i', master, '-map', '0:a', '-map_metadata', '-1',
      '-c:a', 'libmp3lame', '-b:a', BITRATE, '-ar', '44100', '-ac', '2', '-id3v2_version', '3',
      '-metadata', 'title=' + t.title, '-metadata', 'artist=' + t.artist, mp3]);
  }
  if (hasArt && (FORCE || !fresh(jpg))) {
    run(FFMPEG, ['-v', 'error', '-y', '-i', master, '-map', '0:v', '-frames:v', '1',
      '-vf', `scale=${COVER_PX}:${COVER_PX}:force_original_aspect_ratio=increase,crop=${COVER_PX}:${COVER_PX}`,
      '-q:v', String(COVER_Q), jpg]);
  }
  const b = fs.statSync(master).size, a = fs.statSync(mp3).size, c = hasArt ? fs.statSync(jpg).size : 0;
  before += b; after += a + c; if (hasArt) covers++;
  console.log(`${kb(b)} → ${kb(a)} + cover ${hasArt ? kb(c) : '  none'}  ${t.id}`);

  t.master = t.master || t.file;
  t.file = t.id + '.mp3';
  t.cover = hasArt ? 'covers/' + t.id + '.jpg' : null;
}
cat.masterDir = cat.masterDir || cat.base;
/* The shipped catalogue lives IN the output folder (SW v233), so its paths need no base;
   a catalogue kept anywhere else (the old sandbox) gets one pointing at the output. */
{ const rel = path.relative(path.dirname(CAT), OUT).split(path.sep).join('/');
  if (rel) cat.base = rel + '/'; else delete cat.base; }
fs.writeFileSync(CAT, JSON.stringify(cat, null, 1).replace(/\n  +/g, ' ').replace(/\{ "id"/g, '\n  { "id"').replace(/ \}/g, ' }') + '\n');
console.log(`\n${cat.tracks.length} tracks, ${covers} covers: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB  (catalogue updated: ${path.relative(ROOT, CAT)})`);
