// ═══════════════════════════════════════════════════════════════════════════
// nt-maze-transcribe.js — read a maze.game screenshot into a probe board.json.
//
// Dev tooling only (Node, zero dependencies — PNG is inflate + unfilter, and
// zlib is built in). Eyeballing 2×2 anchors off seven screenshots is exactly the
// kind of transcription error that would masquerade as a movement-model gap, so
// the pixels do it instead.
//
//   node tools/nt-maze-transcribe.js "maze-puzzles/38472.png"
//   node tools/nt-maze-transcribe.js "maze-puzzles/38472.png" --json board.json
//   node tools/nt-maze-transcribe.js "maze-puzzles/38472.png" --dump   (colour census)
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const zlib = require('zlib');

// ── PNG → { w, h, px(x,y) -> [r,g,b] } ─────────────────────────────────────────
function readPNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG: ' + file);
  let off = 8, w = 0, h = 0, bitDepth = 0, colourType = 0;
  const idat = [];
  let palette = null, trns = null;
  while (off < buf.length) {
    const len  = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colourType = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG not supported');
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS')   trns = data;
    else if (type === 'IDAT')   idat.push(data);
    else if (type === 'IEND')   break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('only 8-bit PNGs supported (got ' + bitDepth + ')');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colourType];
  if (!channels) throw new Error('unsupported colour type ' + colourType);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = channels;                       // bytes per pixel at depth 8
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);

  // Un-filter, scanline by scanline (PNG spec §9).
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prv = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prv ? prv[i] : 0;
      const c = prv && i >= bpp ? prv[i - bpp] : 0;
      let v = src[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 0xff;
    }
  }

  const px = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return [0, 0, 0];
    const i = y * stride + x * bpp;
    if (colourType === 3) { const p = out[i] * 3; return [palette[p], palette[p + 1], palette[p + 2]]; }
    if (colourType === 0 || colourType === 4) return [out[i], out[i], out[i]];
    return [out[i], out[i + 1], out[i + 2]];
  };
  return { w, h, px };
}

// ── Classification ─────────────────────────────────────────────────────────────
// maze.game's palette, sampled from the supplied screenshots. Everything is judged
// on hue/most-dominant-channel rather than exact RGB, because the board carries a
// soft vignette and per-block gloss that shift absolute values by ±30.
function classify(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx - mn;
  // Orange BEFORE red. The checker's orange (169,122,61) also satisfies a naive red
  // test, so testing red first swallows the finish marker and the board reads as
  // having only one port. The two separate cleanly on g−b: red brick (174,80,74) has
  // g≈b, orange has g well above b.
  if (r > 130 && g > 95 && b < 110 && g - b > 35) return 'flag'; // orange/checker finish
  if (r > 120 && r - g > 60 && Math.abs(g - b) < 35) return 'wall'; // red brick — fixed obstacle
  // ICE (the snowflake glyph on a slowing block) BEFORE port. The glyph is a pale
  // blue that passes a naive port test, which is what shredded a slowing block into
  // 16 px slivers and cost four boards their block-arm measurement. It separates from
  // the port bar on g−r (glyph ~65, bar ~34) and from a cyan player block on b−g
  // (glyph ~30, block ~0). Both gaps are wide; neither is a threshold on brightness.
  if (b > 150 && g - r > 45 && b - g >= 12 && b - g <= 45) return 'ice';
  if (g > 90 && g - r > 30 && g - b > 30)  return 'start';       // green spawn nub
  if (b > 110 && b - r > 30 && b - g > 15) return 'port';        // blue port bar
  if (b > 110 && g > 110 && g - r > 25)    return 'built';       // cyan player block
  // A block's GLOSS half. maze.game paints a big translucent highlight over part of
  // some pieces; where it covers a whole tile the pixel goes pale and warm
  // (192,192,181) and reads as floor on saturation alone, so the piece loses one of
  // its four tiles and no longer pairs into a 2x2. It separates from real floor —
  // which is strictly neutral (178,178,178) — by having ANY saturation at all, with
  // blue the lowest channel. Two boards (111378, 155255) hang on this; the five
  // already-transcribed ones are unchanged by it, which is what makes it safe.
  if (sat >= 6 && sat < 24 && mx > 182 && b < g && b < r) return 'built';
  if (sat < 28 && mx > 60)                 return 'floor';
  return 'other';
}

// ── Grid detection ─────────────────────────────────────────────────────────────
// The playfield is the largest run of low-saturation "floor" pixels. Its extent
// plus a known block size gives the tile pitch; blocks are 2×2 so the pitch is
// derived from a measured block rather than assumed from the extent (an extent
// divided by a guessed count is how an off-by-one grid happens).
function findBoard(img) {
  const { w, h, px } = img;
  const isBoard = (x, y) => {
    const c = classify(...px(x, y));
    return c === 'floor' || c === 'wall' || c === 'built';
  };
  // Scan the middle row/column for the longest contiguous board run.
  const longestRun = (fixed, along, get) => {
    let best = [0, -1], run = -1;
    for (let i = 0; i < along; i++) {
      if (get(i)) { if (run < 0) run = i; }
      else { if (run >= 0 && i - run > best[1] - best[0]) best = [run, i]; run = -1; }
    }
    if (run >= 0 && along - run > best[1] - best[0]) best = [run, along];
    return best;
  };
  const my = h >> 1, mx0 = w >> 2;
  const [x0, x1] = longestRun(my, w, i => isBoard(i, my));
  const [y0, y1] = longestRun(mx0, h, i => isBoard(Math.floor((x0 + x1) / 2), i));
  return { x0, x1, y0, y1 };
}

// Measure the tile pitch from a red wall block (always exactly 2×2, always present).
function measurePitch(img, box) {
  const { px } = img;
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  for (let y = box.y0; y < box.y1; y++) for (let x = box.x0; x < box.x1; x++) {
    if (classify(...px(x, y)) === 'wall') {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { pitch: ((maxX - minX + 1) + (maxY - minY + 1)) / 4, wall: { minX, maxX, minY, maxY } };
}

// ── Automatic grid fit ─────────────────────────────────────────────────────────
// The playfield carries a faint dark line on every tile boundary, but no single
// scanline sees them all — blocks cover the ones they sit on, and block internals
// have dark edges of their own that look exactly like tile lines. Picking minima
// off one scanline therefore locks onto whatever the blocks happen to look like.
//
// So: average the luminance profile across EVERY scanline of the playfield first
// (block edges land at different offsets per row and wash out, real tile lines
// reinforce), then fit pitch and origin by brute force — the (pitch, offset) pair
// whose comb of predicted lines sits in the darkest pixels wins. Two parameters,
// scored against the whole board, rather than one guess off one row.
function fitAxis(profile, lo, hi, fixedPitch, edge) {
  let best = null;
  const pLo = fixedPitch ? fixedPitch : 45, pHi = fixedPitch ? fixedPitch : 85;
  for (let p = pLo; p <= pHi; p += 0.05) {
    for (let o = 0; o < p; o += 0.5) {
      let sum = 0, n = 0;
      for (let a = lo + o; a <= hi + 0.5; a += p) {
        const i = Math.round(a);
        if (i < lo || i > hi) continue;
        sum += Math.min(profile[i], profile[i - 1], profile[i + 1]); n++;
      }
      if (n < 4) continue;
      // Normalise by line count: a coarse pitch places fewer lines and would
      // otherwise win simply by sampling fewer bright pixels.
      const score = sum / n;
      if (!best || score < best.score) best = { score, pitch: p, origin: lo + o };
    }
  }
  if (!best) return null;
  // The fitted comb may start one or more lines in from the board edge; walk it back.
  // `lo` is the SCORING window, inset by half a tile because the flood leaks through the
  // two port gaps — walking back only to `lo` therefore strands the origin a full tile
  // inside the board on any edge whose first grid line is faint, and the derived width
  // comes out one short. `edge` is the true bbox bound, so the walk-back stops where
  // the board actually starts.
  const stop = (edge == null ? lo : edge) - best.pitch * 0.6;
  while (best.origin - best.pitch >= stop) best.origin -= best.pitch;
  return best;
}

// ── Main ───────────────────────────────────────────────────────────────────────
const file = process.argv[2];
if (!file) { console.log('usage: node tools/nt-maze-transcribe.js <file.png> [--json out.json] [--dump]'); process.exit(0); }

const img = readPNG(file);
console.log(file + '  ' + img.w + '×' + img.h);

if (process.argv.includes('--dump')) {
  const census = {};
  for (let y = 0; y < img.h; y += 2) for (let x = 0; x < img.w; x += 2) {
    const c = classify(...img.px(x, y));
    census[c] = (census[c] || 0) + 1;
  }
  console.log('colour census (every 2nd pixel):', census);
}

const box = findBoard(img);
console.log('board box  x ' + box.x0 + '–' + box.x1 + '  y ' + box.y0 + '–' + box.y1 +
            '  (' + (box.x1 - box.x0) + '×' + (box.y1 - box.y0) + ' px)');

const m = measurePitch(img, box);
if (m) {
  console.log('red wall   x ' + m.wall.minX + '–' + m.wall.maxX + '  y ' + m.wall.minY + '–' + m.wall.maxY);
  console.log('tile pitch ' + m.pitch.toFixed(2) + ' px  →  grid ≈ ' +
              ((box.x1 - box.x0) / m.pitch).toFixed(2) + ' × ' + ((box.y1 - box.y0) / m.pitch).toFixed(2) + ' tiles');
}

// Port locations, reported in pixels — the grid origin is settled first, then these
// get converted. Printing them raw makes a misread edge obvious rather than silent.
['start', 'port', 'flag'].forEach(kind => {
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1, n = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (classify(...img.px(x, y)) !== kind) continue;
    n++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (n) console.log(kind.padEnd(10) + ' x ' + minX + '–' + maxX + '  y ' + minY + '–' + maxY + '  (' + n + ' px)');
});

// ── ASCII map (--map [step]) — the fastest way to confirm a read is right.
if (process.argv.includes('--map')) {
  const si = process.argv.indexOf('--map');
  const step = Number(process.argv[si + 1]) || 8;
  const glyph = { wall: '#', built: 'O', floor: '.', port: 'B', start: 'G', flag: 'F', ice: '*', other: ' ' };
  for (let y = 0; y < img.h; y += step) {
    let line = '';
    for (let x = 0; x < img.w; x += step) line += glyph[classify(...img.px(x, y))];
    console.log(String(y).padStart(4) + ' ' + line);
  }
}

// ── Brightness profile (--scan) — locates the playfield edges and the faint
// per-tile grid lines. The grid origin has to come from the lines themselves; an
// extent divided by a guessed tile count is exactly how an off-by-one creeps in.
if (process.argv.includes('--scan')) {
  const si = process.argv.indexOf('--scan');
  const row = Number(process.argv[si + 1]);
  const col = Number(process.argv[si + 2]);
  const lum = (x, y) => { const [r, g, b] = img.px(x, y); return (r + g + b) / 3; };
  if (!Number.isNaN(row)) {
    let out = 'row ' + row + ': ';
    for (let x = 0; x < img.w; x += 1) {
      const v = lum(x, row), l = lum(x - 1, row), r2 = lum(x + 1, row);
      if (v < l - 1.5 && v < r2 - 1.5) out += x + '(' + v.toFixed(0) + ') ';
    }
    console.log(out);
  }
  if (!Number.isNaN(col)) {
    let out = 'col ' + col + ': ';
    for (let y = 0; y < img.h; y += 1) {
      const v = lum(col, y), u = lum(col, y - 1), d = lum(col, y + 1);
      if (v < u - 1.5 && v < d - 1.5) out += y + '(' + v.toFixed(0) + ') ';
    }
    console.log(out);
  }
}

// ── Tile read (--grid x0,y0,pitch,w,h) — sample each tile centre and print the
// board as tiles, then derive the 2×2 anchors and the two ports.
if (process.argv.includes('--grid')) {
  const gi = process.argv.indexOf('--grid');
  const [x0, y0, pitch, gw, gh] = process.argv[gi + 1].split(',').map(Number);
  const centre = (tx, ty) => [Math.round(x0 + (tx + 0.5) * pitch), Math.round(y0 + (ty + 0.5) * pitch)];

  // Threshold, not majority. maze.game's blocks carry big translucent gloss circles
  // that read as low-saturation floor, so a solid tile can be MOSTLY "floor" by pixel
  // count and still obviously be a block. A solid class only has to claim a decent
  // minority of the tile's interior to win.
  const SOLID_MIN = 0.18;
  const tileClass = (tx, ty) => {
    const [cx, cy] = centre(tx, ty), tally = {};
    const r = Math.floor(pitch * 0.35);
    let n = 0;
    for (let dy = -r; dy <= r; dy += 3) for (let dx = -r; dx <= r; dx += 3) {
      const c = classify(...img.px(cx + dx, cy + dy));
      tally[c] = (tally[c] || 0) + 1; n++;
    }
    // Ice first: a slowing block is a wall whose middle is covered by the glyph, so on
    // its two inner tiles the glyph can out-vote the brick. Testing ice before wall is
    // what stops one tile of a slowing block reading 'wall' and its neighbour 'ice'.
    if ((tally.ice || 0) / n >= 0.06) return 'ice';
    for (const k of ['wall', 'built', 'port', 'start', 'flag']) {
      if ((tally[k] || 0) / n >= SOLID_MIN) return k;
    }
    return Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  };

  const glyph = { wall: '#', built: 'O', floor: '.', port: 'B', start: 'G', flag: 'F', ice: '*', other: '?' };
  const grid = [];
  console.log('\ntiles (' + gw + '×' + gh + '):');
  for (let ty = 0; ty < gh; ty++) {
    const row = [];
    let line = '';
    for (let tx = 0; tx < gw; tx++) { const c = tileClass(tx, ty); row.push(c); line += glyph[c] || '?'; }
    grid.push(row);
    console.log('  ' + String(ty).padStart(2) + ' ' + line);
  }

  // 2×2 anchors: greedily claim the top-left of each unconsumed solid pair.
  const solid = (tx, ty) => tx < gw && ty < gh &&
    (grid[ty][tx] === 'wall' || grid[ty][tx] === 'built' || grid[ty][tx] === 'ice');
  const used = grid.map(r => r.map(() => false));
  const blocks = [];
  for (let ty = 0; ty < gh; ty++) for (let tx = 0; tx < gw; tx++) {
    if (used[ty][tx] || !solid(tx, ty)) continue;
    if (solid(tx + 1, ty) && solid(tx, ty + 1) && solid(tx + 1, ty + 1) &&
        !used[ty][tx + 1] && !used[ty + 1][tx] && !used[ty + 1][tx + 1]) {
      used[ty][tx] = used[ty][tx + 1] = used[ty + 1][tx] = used[ty + 1][tx + 1] = true;
      blocks.push([tx, ty]);
    }
  }
  // Repair pass. Every block is 2×2, so three unpaired solids in an L imply the
  // fourth tile — its centre just happened to be under a gloss circle. Recovering it
  // from the shape is safer than lowering SOLID_MIN until floor starts reading solid.
  for (let ty = 0; ty < gh - 1; ty++) for (let tx = 0; tx < gw - 1; tx++) {
    const quad = [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]];
    const free = quad.filter(([x, y]) => !used[y][x]);
    if (free.length !== 4) continue;
    const hits = quad.filter(([x, y]) => solid(x, y));
    if (hits.length !== 3) continue;
    quad.forEach(([x, y]) => { used[y][x] = true; });
    blocks.push([tx, ty]);
    console.log('  repaired 2×2 at ' + JSON.stringify([tx, ty]) + ' — one tile misread as floor');
  }
  blocks.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));

  const leftover = [];
  for (let ty = 0; ty < gh; ty++) for (let tx = 0; tx < gw; tx++) if (solid(tx, ty) && !used[ty][tx]) leftover.push([tx, ty]);
  // A block is SLOWING if any of its four tiles carries the glyph. maze.game's ice
  // block is an obstacle first and a slow second, so it stays in `blocks` and is
  // listed again in `slows` — which is exactly the shape nt-path-probe.js reads.
  const slows = blocks.filter(([bx, by]) =>
    [[0, 0], [1, 0], [0, 1], [1, 1]].some(([dx, dy]) =>
      by + dy < gh && bx + dx < gw && grid[by + dy][bx + dx] === 'ice'));
  if (slows.length) console.log('slows (' + slows.length + '): ' + JSON.stringify(slows));

  console.log('\nblocks (' + blocks.length + '): ' + JSON.stringify(blocks));
  if (leftover.length) console.log('UNPAIRED solid tiles — grid is probably misaligned: ' + JSON.stringify(leftover));

  // Ports, from the coloured markers just outside the playfield. A single sample at
  // half a tile out lands in the white frame and finds nothing — the marker sits in
  // the frame's GAP, at a depth that varies with the frame's rounded lip. So scan a
  // band from the board edge outward and take any hit, then merge runs of adjacent
  // indices into one port (maze.game's ports are two tiles wide, like NT's).
  const edgeBand = (edge, i) => {
    const pts = [];
    for (let d = 0.06; d <= 0.55; d += 0.04) {
      if (edge === 'top')    pts.push([x0 + (i + 0.5) * pitch, y0 - d * pitch]);
      if (edge === 'bottom') pts.push([x0 + (i + 0.5) * pitch, y0 + (gh + d) * pitch]);
      if (edge === 'left')   pts.push([x0 - d * pitch, y0 + (i + 0.5) * pitch]);
      if (edge === 'right')  pts.push([x0 + (gw + d) * pitch, y0 + (i + 0.5) * pitch]);
    }
    const tally = {};
    pts.forEach(([px_, py_]) => { const c = classify(...img.px(Math.round(px_), Math.round(py_))); tally[c] = (tally[c] || 0) + 1; });
    for (const k of ['port', 'start', 'flag']) if ((tally[k] || 0) >= 3) return k;
    return null;
  };

  // Each hit carries WHICH marker classified there ('port' blue bar = spawn, 'flag'
  // orange/checker = finish) so a run can be tagged with its own kind, not just merged
  // by adjacency. A run is genuinely one marker painted across 2 tiles, so its hits
  // share a kind by construction — recording the first is enough.
  const ports = [];
  [['top', gw], ['bottom', gw], ['left', gh], ['right', gh]].forEach(([edge, len]) => {
    const hits = [];
    for (let i = 0; i < len; i++) { const k = edgeBand(edge, i); if (k) hits.push([i, k]); }
    // Merge adjacent indices into single ports.
    let run = null;
    hits.forEach(([i, k]) => {
      if (run && i === run.idx[run.idx.length - 1] + 1) run.idx.push(i);
      else { if (run) ports.push({ edge, idx: run.idx[0], span: run.idx.length, kind: run.kind }); run = { idx: [i], kind: k }; }
    });
    if (run) ports.push({ edge, idx: run.idx[0], span: run.idx.length, kind: run.kind });
  });
  // CORNER MOUTHS. maze.game's mouth is always TWO edge-units wide; at a corner it
  // wraps rather than truncating — one unit along each of the two edges that meet
  // there (48154's egress is the reference: top idx 8 span 1 + right idx 0 span 1).
  // Both openings front the same single tile, so a corner mouth is one port with a
  // one-tile footprint, which is exactly what NT's own ntMouthIdxs() already returns
  // for idx 0 / idx len-1. Left unmerged it reads as three ports and the board is
  // rejected. `corner: true` is recorded for the renderer's benefit, not the router's.
  const CORNERS = [
    { a: ['top', 0],      b: ['left', 0],       at: 'top-left' },
    { a: ['top', gw - 1], b: ['right', 0],      at: 'top-right' },
    { a: ['bottom', 0],   b: ['left', gh - 1],  at: 'bottom-left' },
    { a: ['bottom', gw - 1], b: ['right', gh - 1], at: 'bottom-right' },
  ];
  for (const c of CORNERS) {
    const i = ports.findIndex(p2 => p2.edge === c.a[0] && p2.idx === c.a[1] && p2.span === 1);
    const j = ports.findIndex(p2 => p2.edge === c.b[0] && p2.idx === c.b[1] && p2.span === 1);
    if (i < 0 || j < 0) continue;
    console.log('corner mouth at ' + c.at + ': ' + c.a[0] + '/' + c.a[1] + ' + ' + c.b[0] + '/' + c.b[1] +
                ' — one port, one tile');
    ports[i] = { edge: c.a[0], idx: c.a[1], span: 1, corner: true, kind: ports[i].kind };
    ports.splice(j, 1);
  }
  console.log('ports: ' + JSON.stringify(ports));

  if (ports.length !== 2) console.log('  ← expected exactly 2 ports; check the board edges');
  else {
    // DIRECTION, not scan order. maze.game's finish is always the orange/checker 'flag'
    // marker; the spawn is 'port' (blue bar) or 'start' (green nub). Scanning edges
    // top→bottom→left→right and taking whichever came first is what shipped 111378
    // backwards — a board whose flag happens to sit on an edge scanned before the
    // spawn's silently inverted the whole route direction. Only fall back to scan
    // order when neither/both port is a 'flag' — ambiguous, and worth a loud flag
    // rather than a silent guess.
    let ingressPort = ports[0], egressPort = ports[1];
    const flags = ports.filter(p => p.kind === 'flag');
    if (flags.length === 1) {
      egressPort = flags[0];
      ingressPort = ports.find(p => p !== flags[0]);
    } else {
      console.log('  ← direction is AMBIGUOUS (found ' + flags.length + ' flag markers, need exactly 1) — ' +
                  'falling back to scan order (top,bottom,left,right); verify ingress/egress by eye');
    }
    const board = {
      w: gw, h: gh,
      ingress: { edge: ingressPort.edge, idx: ingressPort.idx, ...(ingressPort.corner ? { corner: true } : {}) },
      egress:  { edge: egressPort.edge, idx: egressPort.idx, ...(egressPort.corner ? { corner: true } : {}) },
      blocks,
    };
    if (slows.length) board.slows = slows;
    console.log('');console.log('board.json:');
    console.log(JSON.stringify(board));
    const ji = process.argv.indexOf('--json');
    if (ji >= 0 && process.argv[ji + 1]) {
      fs.writeFileSync(process.argv[ji + 1], JSON.stringify(board, null, 1) + String.fromCharCode(10));
      console.log('written → ' + process.argv[ji + 1]);
    }
  }
}

// ── Marker bounding boxes within an explicit crop (--bbox x0,x1,y0,y1).
// The right-hand UI chrome shares colours with the board markers, so an
// un-cropped bbox is meaningless — crop to the playfield first.
if (process.argv.includes('--bbox')) {
  const bi = process.argv.indexOf('--bbox');
  const [cx0, cx1, cy0, cy1] = process.argv[bi + 1].split(',').map(Number);
  ['port', 'start', 'flag', 'wall', 'built'].forEach(kind => {
    let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1, n = 0;
    for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) {
      if (classify(...img.px(x, y)) !== kind) continue;
      n++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (n) console.log(kind.padEnd(6) + ' x ' + minX + '–' + maxX + ' (' + (maxX - minX + 1) + 'px)  y ' +
                       minY + '–' + maxY + ' (' + (maxY - minY + 1) + 'px)  n=' + n);
  });
}


// ── Block unit by run length ───────────────────────────────────────────────────
// maze.game draws a faint line on every TILE boundary, but a comb fitted freely
// against those lines is ambiguous by construction: if pitch P fits, 2P fits too
// (it samples a subset of the same dark lines). On the 9×10 boards the fitter
// happened to land on P; on the larger 17×19 ones it landed on 2P and reported a
// board half its real size, with blocks reading 1×1 instead of 2×2.
//
// The tie-breaker is the BLOCK ARM. Every piece on every maze.game board is built
// from 2×2-tile blocks, so the narrowest arm of any piece is exactly one block =
// two tiles. Maximal runs of wall pixels along both axes measure that arm: 132 px
// on the 9×10 boards (pitch 67), 76 px on the 16×18 ones (pitch 38).
//
// The run length is used ONLY to decide the factor of two, never as the pitch
// itself — the arm's rounded corners smear the histogram by a few pixels either
// way, which is harmless for "is this ratio 1 or 2" and would be a 2% pitch error
// if trusted directly. arm/pitch ≈ 2 means the comb found the tile lattice; ≈ 1
// means it found every second line and the pitch halves. Anything else (a board
// with no clean red arm to measure) leaves the free fit alone.
function blockUnit(img, pf) {
  const isWall = (x, y) => { const c = classify(...img.px(x, y)); return c === 'wall' || c === 'ice'; };
  const hist = {};
  // 4 px bins: a block's rounded corners shorten the runs near its top and bottom
  // edges by a pixel or two, which would otherwise smear one arm across four keys.
  const push = r => { if (r >= 15) { const k = Math.round(r / 4) * 4; hist[k] = (hist[k] || 0) + 1; } };
  // A run tolerates a gap of up to GAP px. Without this, a scanline crossing the
  // snowflake glyph is chopped at every anti-aliased pixel between glyph and brick,
  // and the histogram's argmax becomes the sliver width (~16 px) rather than the arm
  // (~132 px) — which is what made all five slowing boards unmeasurable while the
  // three plain ones read correctly. The bridged pixels count toward the run, so the
  // arm comes back at its true width rather than short.
  const GAP = 4;
  const scan = (n, at) => {
    let run = 0, gap = 0;
    for (let i = 0; i < n; i++) {
      if (at(i)) { run += gap + 1; gap = 0; }
      else if (run) { gap++; if (gap > GAP) { push(run); run = 0; gap = 0; } }
    }
    push(run);
  };
  for (let y = pf.y0; y < pf.y1; y++) scan(pf.x1 - pf.x0, i => isWall(pf.x0 + i, y));
  for (let x = pf.x0; x < pf.x1; x++) scan(pf.y1 - pf.y0, i => isWall(x, pf.y0 + i));
  const ranked = Object.entries(hist).map(([k, v]) => [Number(k), v]).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  // The dominant bin is one block arm. Runs at 2× and 3× it are pieces lying end to
  // end and are always rarer, so a plain argmax is enough — but fold in the bin's
  // neighbours, since a 76 px arm scatters a little into 72 and 80.
  const [k0] = ranked[0];
  let num = 0, den = 0;
  for (const [k, v] of ranked) if (Math.abs(k - k0) <= 4) { num += k * v; den += v; }
  return { unit: num / den, votes: den, top: ranked.slice(0, 4) };
}

// ── Playfield extent by flood fill ─────────────────────────────────────────────
// Seeded on the red wall block, which every puzzle has and which is always inside
// the board. The flood crosses floor and blocks but not the bright white track
// frame or the dark seam under it, so the bbox it returns is the playfield and
// nothing else — which is what stops the UI chrome from poisoning the grid fit.
function playfield(img) {
  const { w, h, px } = img;
  const lum = (x, y) => { const [r, g, b] = px(x, y); return (r + g + b) / 3; };
  // The playfield is NOT separated from the white track frame by a brightness jump —
  // both are light grey. It is separated by a thin DARK seam (lum ~107) under the
  // frame's inner lip. So the floor test is a band: too dark is the seam, too bright
  // is the frame. Coloured tiles (wall/built) always pass; they are never either.
  const open = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const c = classify(...px(x, y));
    if (c === 'wall' || c === 'built' || c === 'ice') return true;
    if (c !== 'floor') return false;
    const v = lum(x, y);
    return v >= 130 && v <= 185;
  };
  // Seed: a red-wall pixel, restricted to the left 70% so the score panel and level
  // chips on the right can never supply the seed. It must be an ACTUAL wall pixel, not
  // the centroid of them all — a board whose only red block is an ICE block puts that
  // centroid squarely on the snowflake, which is not `open`, so the flood dies on its
  // own seed and returns a 1×1 playfield. Three of the six slow-model boards fail
  // exactly that way. Taking the wall pixel NEAREST the centroid keeps the old intent
  // (start deep inside the board, never on a rounded block edge) without the trap.
  let cx = 0, cy = 0, n = 0;
  const walls = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w * 0.7; x++) {
    if (classify(...px(x, y)) === 'wall') { walls.push([x, y]); cx += x; cy += y; n++; }
  }
  if (!n) return null;
  cx /= n; cy /= n;
  let seed = walls[0], seedD = Infinity;
  for (const [x, y] of walls) {
    const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d < seedD) { seedD = d; seed = [x, y]; }
  }
  const sx = seed[0], sy = seed[1];

  const seen = new Uint8Array(w * h);
  const q = [sy * w + sx];
  seen[sy * w + sx] = 1;
  let minX = sx, maxX = sx, minY = sy, maxY = sy, head = 0;
  while (head < q.length) {
    const u = q[head++], ux = u % w, uy = (u - ux) / w;
    if (ux < minX) minX = ux; if (ux > maxX) maxX = ux;
    if (uy < minY) minY = uy; if (uy > maxY) maxY = uy;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = ux + dx, ny = uy + dy;
      if (!open(nx, ny)) continue;
      const v = ny * w + nx;
      if (seen[v]) continue;
      seen[v] = 1; q.push(v);
    }
  }
  return { x0: minX, x1: maxX + 1, y0: minY, y1: maxY + 1 };
}

// ── --auto: playfield bbox → averaged profile → comb fit → tile counts.
if (process.argv.includes('--auto') || process.argv.includes('--json')) {
  const pf = playfield(img);
  if (!pf) { console.log('auto: no red wall block found — fall back to --scan/--grid'); }
  else {
    // Averaged luminance profile along each axis, over the playfield only. Sampling
    // the FULL span (not a single line) is what makes block edges cancel.
    const profX = new Float64Array(img.w), profY = new Float64Array(img.h);
    for (let x = pf.x0; x < pf.x1; x++) {
      let s2 = 0, n = 0;
      for (let y = pf.y0; y < pf.y1; y++) { const [r, g, b] = img.px(x, y); s2 += (r + g + b) / 3; n++; }
      profX[x] = s2 / n;
    }
    for (let y = pf.y0; y < pf.y1; y++) {
      let s2 = 0, n = 0;
      for (let x = pf.x0; x < pf.x1; x++) { const [r, g, b] = img.px(x, y); s2 += (r + g + b) / 3; n++; }
      profY[y] = s2 / n;
    }
    // Inset by ~half a tile: the flood leaks through the two port gaps in the frame,
    // so the outer few pixels of the bbox are frame, not board, on those two edges.
    // Free fit first — it finds the lattice precisely but cannot tell P from 2P.
    let fx = fitAxis(profX, pf.x0 + 6, pf.x1 - 6, null, pf.x0);
    let fy = fitAxis(profY, pf.y0 + 6, pf.y1 - 6, null, pf.y0);
    const bu = blockUnit(img, pf);
    if (fx && fy && bu) {
      const ratio = bu.unit / ((fx.pitch + fy.pitch) / 2);
      const verdict = Math.abs(ratio - 1) < 0.25 ? 'halve' : Math.abs(ratio - 2) < 0.5 ? 'keep' : 'unclear';
      console.log('block arm  ' + bu.unit.toFixed(1) + ' px from ' + bu.votes + ' runs  → arm/pitch ' +
                  ratio.toFixed(2) + '  (' + verdict + ')   runs ' +
                  bu.top.map(([k, v]) => k + 'px×' + v).join(' '));
      if (verdict === 'halve') {
        fx = fitAxis(profX, pf.x0 + 6, pf.x1 - 6, fx.pitch / 2, pf.x0);
        fy = fitAxis(profY, pf.y0 + 6, pf.y1 - 6, fy.pitch / 2, pf.y0);
      } else if (verdict === 'unclear') {
        console.log('  ← no clean block arm; trusting the free fit. Confirm with --grid before use.');
      }
    }
    if (!fx || !fy) { console.log('auto: comb fit failed — fall back to --scan/--grid'); }
    else {
      const pitch = (fx.pitch + fy.pitch) / 2;
      const gw = Math.round((pf.x1 - fx.origin) / pitch);
      const gh = Math.round((pf.y1 - fy.origin) / pitch);
      const rx = Math.abs((pf.x1 - fx.origin) - gw * pitch);
      const ry = Math.abs((pf.y1 - fy.origin) - gh * pitch);
      console.log('playfield  x ' + pf.x0 + '–' + pf.x1 + '  y ' + pf.y0 + '–' + pf.y1);
      console.log('comb fit   x0=' + fx.origin.toFixed(1) + ' (p ' + fx.pitch.toFixed(2) + ')  y0=' +
                  fy.origin.toFixed(1) + ' (p ' + fy.pitch.toFixed(2) + ')');
      console.log('auto grid  ' + gw + '×' + gh + ' @ ' + pitch.toFixed(2) + ' px   residual ' +
                  rx.toFixed(1) + '/' + ry.toFixed(1) + ' px' +
                  (Math.abs(fx.pitch - fy.pitch) > 2 ? '   ← axes disagree, check manually' : ''));
      console.log('  --grid ' + [fx.origin.toFixed(1), fy.origin.toFixed(1), pitch.toFixed(2), gw, gh].join(','));
    }
  }
}

// ── --px x,y[,x,y…] — raw pixel readout, for calibrating a threshold by hand.
if (process.argv.includes('--px')) {
  const a = process.argv[process.argv.indexOf('--px') + 1].split(',').map(Number);
  for (let i = 0; i + 1 < a.length; i += 2) {
    const [r, g, b] = img.px(a[i], a[i + 1]);
    console.log('  (' + a[i] + ',' + a[i + 1] + ') rgb ' + r + ',' + g + ',' + b +
                '  lum ' + ((r + g + b) / 3).toFixed(0) + '  → ' + classify(r, g, b));
  }
}
