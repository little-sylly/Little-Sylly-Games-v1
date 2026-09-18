// ═══════════════════════════════════════════════════════════════════════════
// prm-lib.js — Premium lounge: the moulded-plastic helper, canvas-drawn
// surface patterns and the material set. Spec § 4.
//
// Pure: THREE, a canvas factory and smoothNormals are INJECTED, so
// wip/premium/verify-prm-props.js can drive it under Node. No DOM, no globals.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  function prmRoundedRect(THREE, w, h, r) {
    const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* ExtrudeGeometry puts bevelThickness on BOTH ends, so the caller's depth d
     is the total: the straight run is d - 2*bevel. Centred unless opt.center
     === false (the dial's wedge keeps its origin at the dial's centre). */
  function prmExtrude(THREE, shape, d, bevel, opt, smoothNormals) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(d - 2 * bevel, 0.0005), bevelEnabled: bevel > 0,
      bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: opt.bevelSegments || 4, curveSegments: opt.curveSegments || 12 });
    if (opt.center !== false) geo.center();
    if (opt.smooth !== false && smoothNormals) smoothNormals(THREE, geo, opt.crease || 35);
    return geo;
  }

  /* Deterministic pseudo-random: a texture is the same on every mount. */
  const prmRng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  function prmTextures(THREE, makeCanvas) {
    const wrap = (c, rx, ry, linear) => {
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      t.encoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding; return t;
    };
    const flat = (c) => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
    return {
      wood(base = '#dcc2a0', dark = '#b8946a', rx = 3, ry = 3) {
        const c = makeCanvas(512, 512), x = c.getContext('2d'), r = prmRng(7);
        x.fillStyle = base; x.fillRect(0, 0, 512, 512);
        for (let p = 0; p < 6; p++) { x.fillStyle = 'rgba(0,0,0,' + (0.02 + r() * 0.03) + ')'; x.fillRect(0, p * 86, 512, 2); }
        x.strokeStyle = dark;
        for (let i = 0; i < 160; i++) {
          x.globalAlpha = 0.05 + r() * 0.08; x.lineWidth = 1 + r() * 1.5; x.beginPath();
          const y0 = r() * 512; x.moveTo(0, y0);
          for (let xx = 0; xx <= 512; xx += 32) x.lineTo(xx, y0 + Math.sin(xx / 70 + i) * 3);
          x.stroke();
        }
        x.globalAlpha = 1; return wrap(c, rx, ry);
      },
      wallpaper(base = '#e9c4a6', tone = '#d9ad8c', rx = 6, ry = 4) {
        const c = makeCanvas(256, 256), x = c.getContext('2d');
        x.fillStyle = base; x.fillRect(0, 0, 256, 256); x.strokeStyle = tone; x.lineWidth = 6;
        for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(128, 200, 40 + k * 22, Math.PI, 2 * Math.PI); x.stroke(); }
        return wrap(c, rx, ry);
      },
      weave(rx = 12, ry = 9) {
        const c = makeCanvas(128, 128), x = c.getContext('2d');
        x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#9a9a9a';
        for (let i = 0; i < 128; i += 8) { x.fillRect(i, 0, 3, 128); x.fillRect(0, i, 128, 3); }
        return wrap(c, rx, ry, true);
      },
      boucle(rx = 8, ry = 8) {
        const c = makeCanvas(128, 128), x = c.getContext('2d'), r = prmRng(3);
        x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 400; i++) { x.fillStyle = r() > .5 ? '#a0a0a0' : '#606060'; x.beginPath(); x.arc(r() * 128, r() * 128, 2 + r() * 3, 0, 7); x.fill(); }
        return wrap(c, rx, ry, true);
      },
      /* A round braided rug: concentric rope rings with a diagonal twist hatch. Drawn once on a
         square canvas; a cylinder cap's UVs are planar, so the centre lands under the table. */
      braid(base = '#a88a63', tone = '#94764f', size = 512, rings = 22) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2, step = (size / 2) / rings;
        x.fillStyle = base; x.fillRect(0, 0, size, size);
        for (let i = 0; i < rings; i++) {
          const r = (i + 0.5) * step;
          x.strokeStyle = i % 2 ? tone : base; x.lineWidth = step * 0.9; x.beginPath(); x.arc(cx, cx, r, 0, Math.PI * 2); x.stroke();
          x.strokeStyle = 'rgba(0,0,0,0.10)'; x.lineWidth = 1.5;
          const n = Math.max(24, Math.round(r / 3));
          for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2;
            x.beginPath(); x.moveTo(cx + Math.cos(a) * (r - step * 0.4), cx + Math.sin(a) * (r - step * 0.4));
            x.lineTo(cx + Math.cos(a + 0.06) * (r + step * 0.4), cx + Math.sin(a + 0.06) * (r + step * 0.4)); x.stroke(); }
        }
        return flat(c);
      },
      braidBump(size = 512, rings = 22) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2, step = (size / 2) / rings;
        x.fillStyle = '#808080'; x.fillRect(0, 0, size, size);
        for (let i = 0; i < rings; i++) { x.strokeStyle = i % 2 ? '#a8a8a8' : '#585858'; x.lineWidth = step * 0.5; x.beginPath(); x.arc(cx, cx, (i + 0.5) * step, 0, Math.PI * 2); x.stroke(); }
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.LinearEncoding; return t;
      },
      quilt(rx = 4, ry = 5) {
        const c = makeCanvas(128, 128), x = c.getContext('2d');
        x.fillStyle = '#909090'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#404040'; x.lineWidth = 5;
        x.beginPath(); x.moveTo(0, 64); x.lineTo(64, 0); x.lineTo(128, 64); x.lineTo(64, 128); x.closePath(); x.stroke();
        return wrap(c, rx, ry, true);
      },
      /* Shrinks to fit rather than clipping: 'Shelves' on a 128 px screen drew
         as 'helve', and a long game name would lose its ending on the dial's
         readout. Width is ESTIMATED from the character count (~0.55 em for a
         bold sans) — measureText reads back from the context, which the Node
         harness deliberately does not support. */
      label(text, bg = '#f8f1dc', ink = '#2B1B45', w = 256, h = 128) {
        const c = makeCanvas(w, h), x = c.getContext('2d');
        x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = ink;
        const s = String(text === undefined || text === null ? '' : text);
        const fit = s.length ? (w * 0.88) / (s.length * 0.55) : h;
        x.font = 'bold ' + Math.max(8, Math.round(Math.min(h * 0.28, fit))) + 'px Fredoka, sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(s, w / 2, h / 2); return flat(c);
      },
      abstract(seed = 1, w = 128, h = 128) {
        const c = makeCanvas(w, h), x = c.getContext('2d'), r = prmRng(seed);
        const cols = ['#E9408E', '#F0A500', '#8ECAE6', '#B1BCA0', '#a97fd6'];
        x.fillStyle = '#FAFAF9'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath(); x.arc(r() * w, r() * h, 14 + r() * 30, 0, 7); x.fill(); }
        return flat(c);
      },
    };
  }

  function prmMaterials(THREE, tex) {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    return {
      birch:      std({ map: tex.wood(), roughness: .6, metalness: 0 }),
      birchDark:  std({ map: tex.wood('#c9a77f', '#9d7a52'), roughness: .62 }),
      floor:      std({ map: tex.wood('#c99a6b', '#a87a4e', 6, 6), roughness: .5 }),
      wall:       std({ map: tex.wallpaper(), roughness: .95 }),
      /* Braided-jute oat (spec 2026-09-19 § 3.2): the soft oat it replaced was still a
         bright field across the bottom third. Round geometry + braid texture in step 3. */
      rug:        std({ map: tex.braid(), bumpMap: tex.braidBump(), bumpScale: .006, roughness: .95 }),
      rugEdge:    std({ color: '#8d7148', roughness: .95 }),
      /* The sill cattails — fixed furniture colours (never a design role). A warm pot and sage
         blades keep the plant out of the props' hue space, so the only saturated things in frame
         are still the player's own. */
      potCream:   std({ color: '#e8ce8e', roughness: .75 }),
      leaf:       std({ color: '#7f9c63', roughness: .9, side: THREE.DoubleSide }),
      cattail:    std({ color: '#a8836f', roughness: .95 }),
      /* The front plane: deliberately soft and DARK at the edge (original spec § 6) — it frames
         the shot and is the room's one genuinely shadowed mass. */
      fabric:     std({ color: '#6b5a4d', bumpMap: tex.boucle(), bumpScale: .006, roughness: 1 }),
      cream:      std({ color: '#f4efe6', roughness: .55, metalness: .05 }),
      skirting:   std({ color: '#f7f2ea', roughness: .6 }),
      plum:       std({ color: '#2B1B45', roughness: .6 }),
      black:      std({ color: '#1b1b1f', roughness: .45 }),
      chrome:     std({ color: '#cfd3d8', roughness: .25, metalness: .9 }),
      brass:      std({ color: '#c9a24a', roughness: .35, metalness: .85 }),
      curtain:    std({ color: '#f6efe3', roughness: .9, transparent: true, opacity: .92, side: THREE.DoubleSide }),
      /* Warm sun behind a drawn curtain, not open sky (spec 2026-09-19 § 3.2). */
      window:     std({ color: '#f4dcc0', emissive: '#f4dcc0', emissiveIntensity: 0.9, roughness: .8 }),
      yellow:     std({ color: '#F3E2A0', roughness: .55, bumpMap: tex.quilt(), bumpScale: .0025 }),
      yellowDark: std({ color: '#d9c27a', roughness: .55 }),
      paper:      std({ color: '#ffffff', roughness: .8 }),
      sleeve:     std({ color: '#ffffff', roughness: .15, transparent: true, opacity: .85 }),
      /* The cat jar's body. Plain opacity, never MeshPhysical transmission — the cost envelope
         rules that out and at this size opacity reads as glass anyway. */
      glass:      std({ color: '#dfeef5', roughness: .15, metalness: 0, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false }),
      emissive(hex, intensity = 1) { return std({ color: hex, emissive: hex, emissiveIntensity: intensity, roughness: .5 }); },
    };
  }

  function prmCreateLib(THREE, deps) {
    const makeCanvas = deps.makeCanvas, smoothNormals = deps.smoothNormals || null;
    const tex = prmTextures(THREE, makeCanvas);
    return {
      THREE, tex, mats: prmMaterials(THREE, tex), makeCanvas,
      roundedRect: (w, h, r) => prmRoundedRect(THREE, w, h, r),
      /* The caller's w/h/d are the FINISHED size. bevelSize pushes the outline
         outward, so the shape is inset by the bevel first — otherwise every
         moulded part comes out 2*bevel too wide and placements drift. */
      moulded(w, h, d, r, opt = {}) {
        const bevel = Math.min(opt.bevel !== undefined ? opt.bevel : Math.min(r / 3, d / 4), w / 2 - 1e-4, h / 2 - 1e-4, d / 2);
        const shape = prmRoundedRect(THREE, w - 2 * bevel, h - 2 * bevel, Math.max(r - bevel, 1e-4));
        return prmExtrude(THREE, shape, d, bevel, opt, smoothNormals);
      },
      extrude: (shape, d, bevel, opt = {}) => prmExtrude(THREE, shape, d, bevel, opt, smoothNormals),
      /* A droopy ear: a tube swept along a bent curve (rise, lean, fold forward and down),
         flattened in x so it reads as a lobe and not a sausage; an inner tube along the same
         curve pushed forward so the fold shows a paler inside. Local frame: root at the origin,
         +y up, +z toward the viewer. The caller rotates the mesh about z to lean it outward.
         A lathe cannot bend, which is why this is a tube and not a profile. */
      droopEar(points, r, flatten = 0.55) {
        const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
        const outer = new THREE.TubeGeometry(curve, 28, r, 12, false); outer.scale(flatten, 1, 1);
        const inner = new THREE.TubeGeometry(curve, 28, r * 0.5, 10, false); inner.scale(flatten * 0.8, 1, 1); inner.translate(0, 0, r * 0.62);
        const last = points[points.length - 1];
        return { outer, inner, tip: new THREE.Vector3(last[0], last[1], last[2]) };
      },
      role(role, hex, extra = {}) {
        const m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: .52, metalness: .06 }, extra));
        m.userData.prmRole = role; return m;
      },
    };
  }

  /* One loop, spec § 10: every material tagged with a role takes that role's
     colour. Returns the number of meshes repainted (the harness counts it). */
  function prmApplyDesign(root, design) {
    let n = 0;
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      let hit = false;
      mats.forEach(m => {
        const role = m.userData && m.userData.prmRole;
        if (!role || !design[role]) return;
        m.color.set(design[role]);
        if (m.emissive && m.userData.prmEmissive) m.emissive.set(design[role]);
        hit = true;
      });
      if (hit) n++;
    });
    return n;
  }

  const api = { prmCreateLib, prmApplyDesign, prmRoundedRect };
  if (typeof window !== 'undefined') window.PrmLib = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
