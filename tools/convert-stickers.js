// ═══════════════════════════════════════════════════════════════════════════
// convert-stickers.js — downscale + re-encode the controller sticker masters.
//
//   node tools/convert-stickers.js            (reads data/sticker-masters/,
//                                              writes data/stickers/)
//   node tools/convert-stickers.js --dry      (measure, write nothing)
//
// WHY THIS EXISTS RATHER THAN convert-core-art.ps1
//   That script is the house converter and is right for card faces: JPEG, no
//   alpha, 40 KB a card. Stickers cannot use it. Every master is 8-bit RGBA and
//   the alpha is LOAD-BEARING — the adaptive die-cut border (spec D8) traces the
//   artwork's own alpha edge — so JPEG is out, and the 40 KB figure is a JPEG
//   figure that does not transfer.
//
//   The obvious fallback, System.Drawing's PNG encoder, was tried first and is
//   not good enough: resizing 800 px masters to 512 px cut 14.4 MB to only
//   7.4 MB, and three files came out LARGER than their masters. It writes
//   32bpp RGBA at a default deflate level with no filtering and no palette, so
//   an 84% cut in pixels bought a 49% cut in bytes.
//
// WHAT THIS DOES INSTEAD (all of it in Node's own zlib — no dependency, no npm,
// no build step, per CLAUDE.md § Anti-Patterns):
//   1. Decode the master (inflate + unfilter, the same shape as the decoder in
//      tools/nt-maze-transcribe.js).
//   2. Box-filter downscale to 512 px on the longest edge, in PREMULTIPLIED
//      alpha — averaging straight RGBA pulls the colour of fully-transparent
//      texels into the edge and haloes every die-cut.
//   3. Median-cut quantise to <= 256 RGBA colours, and encode as a palette PNG
//      with tRNS. Illustrated art with flat fills quantises almost losslessly
//      and a palette byte is a quarter of an RGBA one.
//   4. Also encode straight RGBA, and keep whichever came out smaller. Art with
//      heavy gradients can lose that bet; the file should not.
//   Both encoders use adaptive per-scanline filtering and deflate level 9.
//
// WHY 512 px
//   A sticker of radius 0.18 on the 4.6-unit body covers ~7.8% of the atlas:
//   160 px at ATLAS = 2048. 512 px is 3.2x that — headroom for the book grid
//   and the art viewer without paying for a 5x oversample. The implementation
//   plan was written assuming ~512 px source art.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data/sticker-masters');
const DST = path.join(ROOT, 'data/stickers');
const MAX_DIM = 512;
const MAX_COLOURS = 256;
const DRY = process.argv.includes('--dry');

// ── Decode ──────────────────────────────────────────────────────────────────
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, w = 0, h = 0, depth = 0, ct = 0;
  const idat = [];
  let palette = null, trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ct = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNGs are not supported');
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error('only 8-bit PNGs supported (got ' + depth + ')');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (!channels) throw new Error('unsupported colour type ' + ct);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const line = raw.slice(pos, pos + stride); pos += stride;
    const o = y * stride, prev = o - stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[o + i - channels] : 0;
      const b = y > 0 ? out[prev + i] : 0;
      const c = (i >= channels && y > 0) ? out[prev + i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      out[o + i] = v & 0xff;
    }
  }

  // Normalise everything to straight RGBA.
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    let r, g, b, al = 255;
    if (ct === 6) { r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; al = out[i * 4 + 3]; }
    else if (ct === 2) { r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2]; }
    else if (ct === 0) { r = g = b = out[i]; }
    else if (ct === 4) { r = g = b = out[i * 2]; al = out[i * 2 + 1]; }
    else { const p = out[i] * 3; r = palette[p]; g = palette[p + 1]; b = palette[p + 2];
           al = trns && out[i] < trns.length ? trns[out[i]] : 255; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = al;
  }
  return { w, h, rgba };
}

// ── Downscale, in premultiplied alpha ───────────────────────────────────────
function downscale(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  const xr = sw / dw, yr = sh / dh;
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * yr), y1 = Math.min(sh, Math.max(y0 + 1, Math.ceil((y + 1) * yr)));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * xr), x1 = Math.min(sw, Math.max(x0 + 1, Math.ceil((x + 1) * xr)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * sw + sx) * 4, al = src[i + 3];
          // Premultiply: a transparent texel contributes its alpha and none of
          // its colour, so the edge does not pick up the background.
          r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al; a += al; n++;
        }
      }
      const o = (y * dw + x) * 4;
      if (a === 0) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; continue; }
      out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a);
      out[o + 2] = Math.round(b / a); out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

// ── PNG encoding ────────────────────────────────────────────────────────────
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/* Adaptive filtering: try all five per scanline and keep the one with the
   smallest sum of absolute differences, which is the heuristic the PNG spec
   itself recommends and the single biggest lever on the deflated size. */
function filterScanlines(px, w, h, bpp) {
  const stride = w * bpp;
  const out = Buffer.alloc(h * (stride + 1));
  const cand = [Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride),
                Buffer.alloc(stride), Buffer.alloc(stride)];
  for (let y = 0; y < h; y++) {
    const o = y * stride, prev = o - stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? px[o + i - bpp] : 0;
      const b = y > 0 ? px[prev + i] : 0;
      const c = (i >= bpp && y > 0) ? px[prev + i - bpp] : 0;
      const v = px[o + i];
      cand[0][i] = v;
      cand[1][i] = (v - a) & 0xff;
      cand[2][i] = (v - b) & 0xff;
      cand[3][i] = (v - ((a + b) >> 1)) & 0xff;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      cand[4][i] = (v - ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c))) & 0xff;
    }
    let best = 0, bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      let s = 0;
      for (let i = 0; i < stride; i++) { const d = cand[f][i]; s += d < 128 ? d : 256 - d; }
      if (s < bestScore) { bestScore = s; best = f; }
    }
    out[y * (stride + 1)] = best;
    cand[best].copy(out, y * (stride + 1) + 1);
  }
  return out;
}

const DEFLATE = { level: 9, memLevel: 9, strategy: zlib.constants.Z_DEFAULT_STRATEGY };

function encodeRGBA(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(filterScanlines(rgba, w, h, 4), DEFLATE);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
                        chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* Median cut over RGBA. Alpha is a fourth axis rather than a separate pass:
   a die-cut sticker's interesting structure is at its edge, where colour and
   alpha vary together, so splitting on whichever axis is widest keeps the
   edge intact instead of spending the palette on interior gradients. */
function quantise(rgba, w, h, maxColours) {
  const n = w * h;

  /* Fully-transparent texels get their OWN reserved palette entry and are kept
     out of the median cut entirely. Averaged in, they drag a box's alpha off
     zero and hand back stray semi-transparent specks outside the artwork —
     measured at up to 73 texels a sticker before this. That is invisible on a
     thumbnail and not invisible to the adaptive die-cut border (spec D8),
     which traces the alpha edge and would trace the specks too. */
  const idx = new Uint32Array(n);
  const clearPixels = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3] === 0) clearPixels.push(i);
    else idx[k++] = i;
  }
  const opaqueCount = k;
  const hasClear = clearPixels.length > 0;
  const budget = hasClear ? maxColours - 1 : maxColours;

  if (opaqueCount === 0) {                       // a wholly transparent image
    return { lookup: new Uint8Array(n), palette: [[0, 0, 0, 0]] };
  }

  let boxes = [{ lo: 0, hi: opaqueCount }];
  const axisOf = (box) => {
    const mn = [255, 255, 255, 255], mx = [0, 0, 0, 0];
    for (let i = box.lo; i < box.hi; i++) {
      const p = idx[i] * 4;
      for (let c = 0; c < 4; c++) {
        const v = rgba[p + c];
        if (v < mn[c]) mn[c] = v;
        if (v > mx[c]) mx[c] = v;
      }
    }
    let a = 0, best = -1;
    for (let c = 0; c < 4; c++) if (mx[c] - mn[c] > best) { best = mx[c] - mn[c]; a = c; }
    return { axis: a, spread: best };
  };

  while (boxes.length < budget) {
    let target = -1, bestSpread = 0, bestAxis = 0;
    for (let b = 0; b < boxes.length; b++) {
      if (boxes[b].hi - boxes[b].lo < 2) continue;
      const { axis, spread } = axisOf(boxes[b]);
      if (spread > bestSpread) { bestSpread = spread; target = b; bestAxis = axis; }
    }
    if (target < 0 || bestSpread === 0) break;
    const box = boxes[target];
    const slice = Array.prototype.slice.call(idx.subarray(box.lo, box.hi));
    slice.sort((p, q) => rgba[p * 4 + bestAxis] - rgba[q * 4 + bestAxis]);
    for (let i = 0; i < slice.length; i++) idx[box.lo + i] = slice[i];
    const mid = box.lo + (slice.length >> 1);
    boxes.splice(target, 1, { lo: box.lo, hi: mid }, { lo: mid, hi: box.hi });
  }

  // Entry 0 is the reserved transparent slot, so tRNS stays one byte long.
  const palette = hasClear ? [[0, 0, 0, 0]] : [];
  const base = palette.length;
  const lookup = new Uint8Array(n);
  for (const i of clearPixels) lookup[i] = 0;
  for (let b = 0; b < boxes.length; b++) {
    const box = boxes[b];
    let r = 0, g = 0, bl = 0, a = 0;
    const cnt = box.hi - box.lo;
    if (!cnt) { palette.push([0, 0, 0, 0]); continue; }
    for (let i = box.lo; i < box.hi; i++) {
      const p = idx[i] * 4;
      r += rgba[p]; g += rgba[p + 1]; bl += rgba[p + 2]; a += rgba[p + 3];
    }
    // An opaque box must never round its way back to alpha 0: that would make
    // real artwork share the reserved transparent entry's meaning.
    const av = Math.max(1, Math.round(a / cnt));
    palette.push([Math.round(r / cnt), Math.round(g / cnt), Math.round(bl / cnt), av]);
    for (let i = box.lo; i < box.hi; i++) lookup[idx[i]] = base + b;
  }
  return { lookup, palette };
}

function encodeIndexed(lookup, palette, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const plte = Buffer.alloc(palette.length * 3);
  palette.forEach((c, i) => { plte[i * 3] = c[0]; plte[i * 3 + 1] = c[1]; plte[i * 3 + 2] = c[2]; });
  // tRNS only needs to reach the last non-opaque entry.
  let last = -1;
  palette.forEach((c, i) => { if (c[3] < 255) last = i; });
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
                 chunk('IHDR', ihdr), chunk('PLTE', plte)];
  if (last >= 0) {
    const trns = Buffer.alloc(last + 1);
    for (let i = 0; i <= last; i++) trns[i] = palette[i][3];
    parts.push(chunk('tRNS', trns));
  }
  parts.push(chunk('IDAT', zlib.deflateSync(filterScanlines(Buffer.from(lookup), w, h, 1), DEFLATE)));
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// ── Run ─────────────────────────────────────────────────────────────────────
if (!fs.existsSync(SRC)) { console.error('No masters folder at ' + SRC); process.exit(1); }
const files = fs.readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.png')).sort();
let before = 0, after = 0;
console.log('file          master        ->  out         mode      KB in  KB out');
for (const f of files) {
  const buf = fs.readFileSync(path.join(SRC, f));
  const { w, h, rgba } = decodePNG(buf);
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  const dw = Math.max(1, Math.round(w * scale)), dh = Math.max(1, Math.round(h * scale));
  const small = scale < 1 ? downscale(rgba, w, h, dw, dh) : rgba;

  const asRGBA = encodeRGBA(small, dw, dh);
  const { lookup, palette } = quantise(small, dw, dh, MAX_COLOURS);
  const asIdx = encodeIndexed(lookup, palette, dw, dh);
  const win = asIdx.length <= asRGBA.length ? asIdx : asRGBA;
  const mode = asIdx.length <= asRGBA.length ? 'palette' : 'rgba';

  if (!DRY) fs.writeFileSync(path.join(DST, f), win);
  before += buf.length; after += win.length;
  console.log(f.padEnd(12) + ' ' + (w + 'x' + h).padEnd(12) + ' -> ' +
              (dw + 'x' + dh).padEnd(10) + '  ' + mode.padEnd(8) + ' ' +
              String(Math.round(buf.length / 1024)).padStart(6) + '  ' +
              String(Math.round(win.length / 1024)).padStart(6));
}
console.log('---');
console.log(files.length + ' files: ' + (before / 1048576).toFixed(1) + ' MB -> ' +
            (after / 1048576).toFixed(2) + ' MB (' + (before / after).toFixed(1) + 'x smaller)' +
            (DRY ? '   [DRY RUN — nothing written]' : ''));
