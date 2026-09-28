// ═══════════════════════════════════════════════════════════════════════════
// cld-art.js — Cold Shoulder's procedural art. Exposed as window.CldArt.
//
// PURE, like dyb-dice.js: every function takes what it draws as arguments and
// reads no cld* game state. The only state in here lives in objects the CALLER
// creates and owns — a floe surface (makeFloe), a particle system (makeFx) —
// plus two lazily-built texture tiles that are assets, not state.
//
// Look: the sticker's — inked watercolour, chubby upright penguins, a thick
// snow floe with bevelled ice chunks, a cold sea that moves. Everything is
// drawn at runtime: zero bytes of art in the install.
//
// Frame of reference: WORLD units (the physics world), y down. A penguin is
// anchored at its FOOTPRINT centre — the collision circle — and its body rises
// up the screen from there, so contacts still read true at the feet.
// Depends on: nothing.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const TAU = Math.PI * 2;
  const INK = '#2b2a38';
  const BELLY = '#fcf5e8', BELLY_SHADE = '#efd9c2';
  const FACE = '#fffdf8';
  const BEAK = '#f5a12c', BEAK_DARK = '#c26d14';
  const FEET = '#f7a33b', FEET_DARK = '#c9731c';
  const BLUSH = 'rgba(245,124,124,0.55)';
  const HAS_DOM = typeof document !== 'undefined' && !!document.createElement;

  // ── Colour ────────────────────────────────────────────────────────────────
  function rgbOf(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function mix(hex, to, t, a) {
    const c = rgbOf(hex), d = typeof to === 'number' ? [to, to, to] : rgbOf(to);
    const v = c.map((x, i) => Math.round(x + (d[i] - x) * t));
    return a === undefined ? 'rgb(' + v.join(',') + ')' : 'rgba(' + v.join(',') + ',' + a + ')';
  }
  const lighten = (hex, t, a) => mix(hex, 255, t, a);
  const darken  = (hex, t, a) => mix(hex, 0, t, a);
  const alpha   = (hex, a) => mix(hex, 0, 0, a);

  // ── Seeded helpers (textures must not crawl frame to frame) ─────────────
  function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
  function rng(seed) {
    let s = (seed >>> 0) || 0x2545f491;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // ── Paper grain — one tile, multiplied over every watercolour fill ───────
  let grainTile = null;
  function grain(ctx) {
    if (!HAS_DOM) return null;
    if (!grainTile) {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, 96, 96);
      const R = rng(7);
      for (let i = 0; i < 520; i++) {
        const x = R() * 96, y = R() * 96, s = 0.6 + R() * 2.4;
        g.fillStyle = 'rgba(70,80,110,' + (0.04 + R() * 0.10) + ')';
        g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
      }
      grainTile = c;
    }
    return ctx.createPattern(grainTile, 'repeat');
  }

  // ═════════════════════════════════════════════════════════════════════════
  // THE PENGUIN
  //
  //   penguin(ctx, o)
  //     o.x, o.y   footprint centre (world)      o.r     collision radius
  //     o.tint     player colour (hex)           o.t     clock, seconds
  //     o.pose     'idle' | 'aim' | 'slide' | 'squash' | 'plunge' | 'bob' |
  //                'back' | 'throw' | 'win'
  //     o.look     radians — where it faces (world). Drives the fake turn.
  //     o.power    0..1 — the wind-up (aim)       o.k   0..1 progress (plunge/squash)
  //     o.vel      { x, y } — for 'slide'        o.expr  override the pose's face
  //     o.me, o.second, o.dim, o.splat (0..1), o.seed (desyncs blinks), o.px (px per unit)
  // ═════════════════════════════════════════════════════════════════════════
  function posePars(o) {
    const t = o.t || 0, sd = o.seed || 0;
    const P = { rot: 0, sx: 1, sy: 1, lift: 0, flipL: 0.22, flipR: 0.22, frontL: false, frontR: false,
                feet: true, sink: 0, expr: 'happy', lookX: 0, lookY: 1, back: false, bob: 0, pivot: 0 };
    const look = (o.look === undefined || o.look === null) ? Math.PI / 2 : o.look;
    const lx = Math.cos(look), ly = Math.sin(look);
    P.lookX = lx; P.lookY = ly;
    switch (o.pose) {
      case 'aim': {
        const p = Math.max(0, Math.min(1, o.power || 0));
        // Winding up: the body leans AWAY from the shot and squats into it.
        P.rot = -lx * 0.30 * p;
        P.sx = 1 + 0.10 * p; P.sy = 1 - 0.10 * p;
        P.flipL = 0.5 + 0.9 * p; P.flipR = 0.5 + 0.9 * p;
        P.expr = p > 0.92 ? 'strain' : 'focus';
        if (p > 0.97) P.rot += Math.sin(t * 40) * 0.03;          // straining at the leash
        break;
      }
      case 'slide': {
        // Tobogganing: flat on the belly, head first along the travel. From up
        // here that is the penguin's BACK — no face, no upside-down smile.
        const v = o.vel || { x: 0, y: 1 };
        P.rot = Math.atan2(v.y, v.x) + Math.PI / 2;
        P.sx = 0.96; P.sy = 0.84; P.back = true; P.feet = false; P.pivot = 0.83;
        P.flipL = 0.55; P.flipR = 0.55;
        break;
      }
      case 'squash': {
        const k = o.k || 0;
        const s = Math.sin(Math.min(1, k) * Math.PI);
        P.sx = 1 + 0.26 * s; P.sy = 1 - 0.22 * s; P.expr = 'shock';
        P.flipL = 1.2 * s + 0.2; P.flipR = 1.2 * s + 0.2;
        break;
      }
      case 'plunge': {
        // Over the lip and in: tip outward, drop, splash (the caller spawns it).
        const k = Math.max(0, Math.min(1, o.k || 0));
        P.rot = (o.outward || 0) * 1.1 * k;
        P.sink = 0.2 + 0.7 * k; P.expr = 'shock';
        P.flipL = 2.2 + Math.sin(t * 30) * 0.5; P.flipR = 2.2 + Math.cos(t * 30) * 0.5;
        P.feet = false;
        break;
      }
      case 'bob':
      case 'back':
      case 'throw': {
        // In the Drink: bobbing on a slow swell, a heckler, not a casualty.
        P.bob = Math.sin(t * 2.3 + sd * 1.7) * 0.07;
        P.rot = Math.sin(t * 1.6 + sd) * 0.08;
        P.sink = o.pose === 'back' ? 0.50 : 0.40;
        P.feet = false;
        P.expr = o.pose === 'back' ? 'dizzy' : 'grumpy';
        P.flipL = 0.9 + Math.sin(t * 3 + sd) * 0.25; P.flipR = 0.9 + Math.cos(t * 3 + sd) * 0.25;
        if (o.pose === 'throw') { P.flipR = 2.6; P.frontR = true; P.expr = 'focus'; }
        break;
      }
      case 'win': {
        const h = Math.abs(Math.sin(t * 5));
        P.lift = h * 0.55; P.sy = 1 + 0.05 * h; P.sx = 1 - 0.04 * h;
        P.flipL = 2.5; P.flipR = 2.5; P.frontL = true; P.frontR = true; P.expr = 'happy';
        P.lookX = 0; P.lookY = 1;
        break;
      }
      case 'idle':
      default: {
        const b = Math.sin(t * 1.9 + sd * 2.1);
        P.sy = 1 + 0.018 * b; P.sx = 1 - 0.012 * b;
        P.rot = Math.sin(t * 1.1 + sd) * 0.035;
        P.flipL = 0.22 + b * 0.05; P.flipR = 0.22 - b * 0.05;
        P.expr = 'happy';
      }
    }
    if (o.expr) P.expr = o.expr;
    return P;
  }

  // The body: one closed bean, chubby at the base, head merged in (the sticker's
  // silhouette). Local units of r; origin = footprint centre; up is -y.
  function bodyPath(r) {
    const p = new Path2D();
    p.moveTo(0, 0.34 * r);
    p.bezierCurveTo( 0.70 * r,  0.36 * r,  1.04 * r,  0.02 * r,  1.01 * r, -0.50 * r);
    p.bezierCurveTo( 0.99 * r, -1.06 * r,  0.82 * r, -1.66 * r,  0.36 * r, -1.92 * r);
    p.bezierCurveTo( 0.15 * r, -2.03 * r, -0.15 * r, -2.03 * r, -0.36 * r, -1.92 * r);
    p.bezierCurveTo(-0.82 * r, -1.66 * r, -0.99 * r, -1.06 * r, -1.01 * r, -0.50 * r);
    p.bezierCurveTo(-1.04 * r,  0.02 * r, -0.70 * r,  0.36 * r,  0, 0.34 * r);
    p.closePath();
    return p;
  }
  const bodyCache = new Map();
  function bodyOf(r) {
    const k = Math.round(r * 100);
    if (!bodyCache.has(k)) bodyCache.set(k, bodyPath(r));
    return bodyCache.get(k);
  }

  function flipper(ctx, r, side, ang, tint) {
    ctx.save();
    ctx.translate(side * 0.84 * r, -1.02 * r);
    ctx.rotate(-side * ang);
    ctx.beginPath();
    ctx.moveTo(0, -0.10 * r);
    ctx.bezierCurveTo(side * 0.34 * r, 0.02 * r, side * 0.40 * r, 0.52 * r, side * 0.20 * r, 0.80 * r);
    ctx.bezierCurveTo(side * 0.08 * r, 0.62 * r, -side * 0.06 * r, 0.30 * r, -side * 0.04 * r, 0.02 * r);
    ctx.closePath();
    ctx.fillStyle = darken(tint, 0.10);
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.075 * r; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  function feet(ctx, r, t, moving) {
    [-1, 1].forEach(side => {
      const lift = moving ? Math.max(0, Math.sin(t * 9 + side)) * 0.08 * r : 0;
      ctx.beginPath();
      ctx.ellipse(side * 0.36 * r, 0.38 * r - lift, 0.28 * r, 0.13 * r, side * 0.28, 0, TAU);
      ctx.fillStyle = FEET; ctx.fill();
      ctx.strokeStyle = FEET_DARK; ctx.lineWidth = 0.06 * r; ctx.stroke();
    });
  }

  function eye(ctx, x, y, r, expr, side, blink) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.fillStyle = INK;
    const lw = 0.078 * r;
    if (blink && (expr === 'happy' || expr === 'open' || expr === 'focus')) expr = 'shut';
    switch (expr) {
      case 'happy':              // the sticker's ∩ ∩
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(x, y + 0.04 * r, 0.105 * r, Math.PI + 0.25, TAU - 0.25); ctx.stroke();
        break;
      case 'shut':
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x - 0.09 * r, y); ctx.lineTo(x + 0.09 * r, y); ctx.stroke();
        break;
      case 'shock':
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(x, y, 0.135 * r, 0.16 * r, 0, 0, TAU); ctx.fill();
        ctx.lineWidth = lw * 0.8; ctx.stroke();
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(x, y + 0.02 * r, 0.06 * r, 0, TAU); ctx.fill();
        break;
      case 'dizzy':
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        for (let k = 0; k <= 18; k++) {
          const a = k * 0.62 * side, rr = 0.02 * r + k * 0.0068 * r;
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      default: {                 // open / focus / grumpy / strain — a dot with a glint
        ctx.beginPath(); ctx.ellipse(x, y, 0.085 * r, expr === 'strain' ? 0.06 * r : 0.108 * r, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x + 0.03 * r, y - 0.04 * r, 0.032 * r, 0, TAU); ctx.fill();
        if (expr === 'focus' || expr === 'grumpy' || expr === 'strain') {
          // A brow slanting down to the middle: determined (focus) or cross (grumpy).
          const tilt = expr === 'grumpy' ? 0.10 : 0.06;
          ctx.lineWidth = lw * 0.9;
          ctx.beginPath();
          ctx.moveTo(x - side * 0.11 * r, y - 0.19 * r - tilt * r);
          ctx.lineTo(x + side * 0.10 * r, y - 0.15 * r);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function penguin(ctx, o) {
    const r = o.r, tint = o.tint, t = o.t || 0;
    const P = posePars(o);
    const px = o.px || 2;                         // screen px per world unit — for detail LOD
    const inWater = P.sink > 0;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.dim) ctx.globalAlpha *= 0.72;

    // ── On the ice: a soft shadow and the owner ring, UNDER everything ──────
    if (!inWater) {
      ctx.save();
      if (o.pose === 'slide') ctx.rotate(P.rot);
      ctx.beginPath();
      if (o.pose === 'slide') ctx.ellipse(0.1 * r, 0.12 * r, 0.95 * r, 1.3 * r, 0, 0, TAU);
      else ctx.ellipse(0.12 * r, 0.22 * r, 1.05 * r, 0.5 * r, 0, 0, TAU);
      ctx.fillStyle = 'rgba(40,86,120,0.22)';
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = Math.max(0.16 * r, 1.4 / px * 2);
      ctx.strokeStyle = o.second ? darken(tint, 0.38) : tint;
      ctx.beginPath(); ctx.ellipse(0, 0.08 * r, 1.28 * r, 0.62 * r, 0, 0, TAU); ctx.stroke();
      if (o.me) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = Math.max(0.12 * r, 1.2 / px * 2);
        ctx.beginPath(); ctx.ellipse(0, 0.08 * r, 1.5 * r, 0.76 * r, 0, 0, TAU); ctx.stroke();
      }
    }

    ctx.translate(0, -P.lift * r + P.bob * r);
    ctx.rotate(P.rot);
    ctx.scale(P.sx, P.sy);
    if (P.pivot) ctx.translate(0, P.pivot * r);

    const body = bodyOf(r);
    // Waterline in LOCAL units: sink is the fraction of the ~2.3r body under water.
    const wl = 0.34 * r - P.sink * 2.3 * r;

    const paint = (under) => {
      // Flippers behind the body unless raised in front (throw / win).
      if (!P.frontL) flipper(ctx, r, -1, P.flipL, tint);
      if (!P.frontR) flipper(ctx, r, 1, P.flipR, tint);
      if (P.feet && !under) feet(ctx, r, t, o.pose === 'idle' && (o.moving || false));
      if (P.back && !under) {
        // Tobogganing from above: the beak pokes out past the head, the feet trail behind.
        ctx.fillStyle = BEAK; ctx.strokeStyle = BEAK_DARK; ctx.lineWidth = 0.05 * r;
        ctx.beginPath(); ctx.moveTo(-0.14 * r, -1.9 * r); ctx.lineTo(0, -2.3 * r); ctx.lineTo(0.14 * r, -1.9 * r); ctx.closePath(); ctx.fill(); ctx.stroke();
        [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(sd * 0.3 * r, 0.44 * r, 0.13 * r, 0.26 * r, sd * 0.3, 0, TAU); ctx.fillStyle = FEET; ctx.fill(); ctx.strokeStyle = FEET_DARK; ctx.stroke(); });
      }

      // ── Watercolour body: a wash, a pool of pigment at the edges, grain ────
      ctx.fillStyle = lighten(tint, 0.12);
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      const g = ctx.createRadialGradient(-0.38 * r, -1.35 * r, 0.1 * r, -0.1 * r, -0.7 * r, 2.3 * r);
      g.addColorStop(0, lighten(tint, 0.55, 0.95));
      g.addColorStop(0.45, lighten(tint, 0.12, 0.0));
      g.addColorStop(1, darken(tint, 0.30, 0.9));
      ctx.fillStyle = g; ctx.fill(body);
      ctx.lineWidth = 0.34 * r; ctx.strokeStyle = darken(tint, 0.22, 0.42);
      ctx.stroke(body);                                    // edge-pooled pigment
      {
        const lx = P.lookX, ly = P.lookY;
        const front = P.back ? 0 : Math.max(0, Math.min(1, (ly + 0.45) / 1.2));   // 0 = seen from behind
        if (front < 0.6) {
          // Back view: a darker saddle down the spine and the back of the head.
          ctx.save();
          ctx.globalAlpha *= 1 - front / 0.6;
          ctx.fillStyle = darken(tint, 0.18, 0.55);
          ctx.beginPath(); ctx.ellipse(lx * -0.1 * r, -0.95 * r, 0.5 * r, 0.95 * r, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = lighten(tint, 0.35, 0.5);
          ctx.beginPath(); ctx.ellipse(-0.18 * r, -1.55 * r, 0.26 * r, 0.14 * r, -0.4, 0, TAU); ctx.fill();
          ctx.restore();
        }
        if (front > 0.02) {
          ctx.save();
          ctx.globalAlpha *= Math.min(1, front * 2.2);
          // Belly: shifts toward the way it faces and narrows as it turns away.
          const bx = lx * 0.24 * r, bw = (0.42 + 0.38 * front) * r;
          ctx.beginPath(); ctx.ellipse(bx, -0.36 * r, bw, 0.74 * r, 0, 0, TAU);
          const bg = ctx.createLinearGradient(bx - bw, -1.0 * r, bx + bw, 0.3 * r);
          bg.addColorStop(0, BELLY); bg.addColorStop(0.7, BELLY); bg.addColorStop(1, BELLY_SHADE);
          ctx.fillStyle = bg; ctx.fill();
          // Face mask: the pale patch round the eyes, like the sticker's.
          const fx = lx * 0.38 * r, fy = -1.30 * r + (1 - front) * 0.08 * r, fw = (0.30 + 0.30 * front) * r;
          ctx.beginPath();
          ctx.ellipse(fx - fw * 0.42, fy, fw * 0.62, 0.33 * r, -0.2, 0, TAU);
          ctx.ellipse(fx + fw * 0.42, fy, fw * 0.62, 0.33 * r, 0.2, 0, TAU);
          ctx.fillStyle = FACE; ctx.fill();
          if (!under) {
            // Blush, eyes, beak — the face is the whole personality.
            ctx.fillStyle = BLUSH;
            [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(fx + s * fw * 0.78, fy + 0.20 * r, 0.14 * r, 0.075 * r, 0, 0, TAU); ctx.fill(); });
            const blink = (P.expr === 'happy' || P.expr === 'open' || P.expr === 'focus') &&
                          ((t + (o.seed || 0) * 1.37) % 3.7) < 0.12;
            [-1, 1].forEach(s => eye(ctx, fx + s * fw * 0.44, fy - 0.02 * r, r, P.expr, s, blink));
            const bxx = fx + lx * 0.10 * r, byy = fy + 0.16 * r;
            const dirx = lx * 0.9, diry = 0.55 + 0.35 * Math.max(0, ly);
            const dl = Math.hypot(dirx, diry) || 1;
            const ux = dirx / dl, uy = diry / dl, nx = -uy, ny = ux;
            const L = 0.27 * r, W = 0.14 * r;
            const open = P.expr === 'shock' || P.expr === 'strain';
            ctx.fillStyle = BEAK; ctx.strokeStyle = BEAK_DARK; ctx.lineWidth = 0.05 * r; ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(bxx + nx * W, byy + ny * W);
            ctx.lineTo(bxx + ux * L - (open ? nx * 0.07 * r : 0), byy + uy * L - (open ? ny * 0.07 * r : 0));
            ctx.lineTo(bxx - nx * W, byy - ny * W);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            if (open) {
              ctx.beginPath();
              ctx.moveTo(bxx + nx * W * 0.7, byy + ny * W * 0.7 + 0.05 * r);
              ctx.lineTo(bxx + ux * L * 0.8 + nx * 0.1 * r, byy + uy * L * 0.8 + ny * 0.1 * r + 0.05 * r);
              ctx.lineTo(bxx - nx * W * 0.7, byy - ny * W * 0.7 + 0.05 * r);
              ctx.closePath(); ctx.fillStyle = BEAK_DARK; ctx.fill();
            }
          }
          ctx.restore();
        }
      }
      // Grain, then a little hatching on the shadow side when big enough to see.
      const pat = grain(ctx);
      if (pat) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha *= 0.3;
        ctx.fillStyle = pat; ctx.fill(body);
        ctx.globalAlpha /= 0.3;
        ctx.globalCompositeOperation = 'source-over';
      }
      if (o.splat > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * o.splat) + ')';
        ctx.beginPath(); ctx.arc(-0.35 * r, -1.25 * r, 0.34 * r, 0, TAU);
        ctx.arc(-0.05 * r, -1.45 * r, 0.22 * r, 0, TAU); ctx.arc(-0.6 * r, -1.0 * r, 0.18 * r, 0, TAU); ctx.fill();
      }
      ctx.restore();                                         // unclip
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.085 * r, 0.9 / px); ctx.lineJoin = 'round';
      ctx.stroke(body);
      if (P.frontL) flipper(ctx, r, -1, P.flipL, tint);
      if (P.frontR) flipper(ctx, r, 1, P.flipR, tint);
      if (o.pose === 'throw' && P.frontR) {
        // A snowball held up in the raised flipper.
        ctx.save();
        ctx.translate(0.84 * r, -1.02 * r); ctx.rotate(-P.flipR);
        ctx.beginPath(); ctx.arc(0.2 * r, 0.92 * r, 0.26 * r, 0, TAU);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.06 * r; ctx.stroke();
        ctx.restore();
      }
    };

    if (!inWater) {
      paint(false);
    } else {
      // Above the waterline at full strength; below it, a ghost through the sea.
      ctx.save(); ctx.beginPath(); ctx.rect(-3 * r, -4 * r, 6 * r, wl + 4 * r); ctx.clip(); paint(false); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(-3 * r, wl, 6 * r, 4 * r); ctx.clip();
      ctx.globalAlpha *= 0.28; paint(true); ctx.restore();
      // The waterline itself: a foam collar and two slow rings.
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.26 * r;
      ctx.beginPath(); ctx.ellipse(0, wl, 1.12 * r, 0.32 * r, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = o.second ? darken(tint, 0.38) : tint;
      ctx.lineWidth = 0.13 * r;
      ctx.stroke();
      if (o.me) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 0.1 * r;
        ctx.beginPath(); ctx.ellipse(0, wl, 1.36 * r, 0.44 * r, 0, 0, TAU); ctx.stroke();
      }
      for (let k = 0; k < 2; k++) {
        const ph = ((t * 0.55 + k * 0.5 + (o.seed || 0) * 0.13) % 1);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 * (1 - ph)) + ')';
        ctx.lineWidth = 0.07 * r;
        ctx.beginPath(); ctx.ellipse(0, wl, (1.15 + ph * 1.1) * r, (0.33 + ph * 0.32) * r, 0, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // "That's you": a small chevron bouncing over the head.
  function meMarker(ctx, x, y, r, tint, t, px) {
    const h = y - 2.75 * r - Math.abs(Math.sin(t * 3.2)) * 0.35 * r;
    const s = Math.max(0.55 * r, 5 / (px || 1));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - s, h - s * 0.9); ctx.lineTo(x + s, h - s * 0.9); ctx.lineTo(x, h + s * 0.35); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(0.16 * r, 1.6 / (px || 1)); ctx.strokeStyle = tint; ctx.stroke();
    ctx.restore();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // THE FLOE — a thick slab of snow. The static surface is painted ONCE per
  // radius into an offscreen canvas the caller owns (makeFloe), and marks
  // (belly-slide grooves, snowball splats) are painted into it as they happen,
  // so the floe keeps the story of the Floe-Off on it.
  // ═════════════════════════════════════════════════════════════════════════
  function makeFloe(cx, cy, radius, seed, q) {
    const f = { cx: cx, cy: cy, radius: radius, seed: seed || 1, q: q || 3, canvas: null, sparkles: [] };
    paintFloe(f);
    return f;
  }

  function paintFloe(f) {
    const R = f.radius, Q = f.q, S = Math.ceil(2 * R * Q) + 4;
    const rand = rng(f.seed * 9973 + Math.round(R));
    f.sparkles = [];
    for (let i = 0; i < 26; i++) {
      const a = rand() * TAU, d = Math.sqrt(rand()) * R * 0.92;
      f.sparkles.push({ x: f.cx + Math.cos(a) * d, y: f.cy + Math.sin(a) * d, ph: rand() * TAU, s: 0.8 + rand() * 1.2 });
    }
    if (!HAS_DOM) return;
    const c = f.canvas || document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.setTransform(Q, 0, 0, Q, S / 2, S / 2);                // local origin = floe centre
    g.clearRect(-R - 2, -R - 2, 2 * R + 4, 2 * R + 4);
    g.save();
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();

    // Base: bright where the low sun catches it, cooler towards the rim.
    const base = g.createRadialGradient(-0.3 * R, -0.35 * R, R * 0.05, 0, 0, R * 1.02);
    base.addColorStop(0, '#ffffff');
    base.addColorStop(0.55, '#f1f8fb');
    base.addColorStop(0.88, '#dcedf5');
    base.addColorStop(1, '#c4e0ec');
    g.fillStyle = base; g.fillRect(-R, -R, 2 * R, 2 * R);

    // Lumpy snow: soft mounds lit from the top-left.
    for (let i = 0; i < 170; i++) {
      const a = rand() * TAU, d = Math.sqrt(rand()) * R, x = Math.cos(a) * d, y = Math.sin(a) * d;
      const s = 4 + rand() * 13;
      const m = g.createRadialGradient(x - s * 0.35, y - s * 0.4, s * 0.1, x, y, s);
      m.addColorStop(0, 'rgba(255,255,255,0.5)');
      m.addColorStop(0.5, 'rgba(255,255,255,0)');
      m.addColorStop(0.78, 'rgba(120,170,200,0.07)');
      m.addColorStop(1, 'rgba(120,170,200,0)');
      g.fillStyle = m; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    // Wind drifts: long soft blue crescents with a bright crest.
    for (let i = 0; i < 7; i++) {
      const a = rand() * TAU, d = (0.25 + rand() * 0.6) * R, x = Math.cos(a) * d, y = Math.sin(a) * d;
      const len = 18 + rand() * 30, rot = 0.4 + (rand() - 0.5) * 0.5;
      g.save(); g.translate(x, y); g.rotate(rot);
      g.strokeStyle = 'rgba(110,165,198,0.16)'; g.lineWidth = 4.5; g.lineCap = 'round';
      g.beginPath(); g.ellipse(0, 2, len, 6, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(0, 0, len, 6, 0, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      g.restore();
    }
    // Cracks: short branching lines, carved (a dark line with a lit lip).
    for (let i = 0; i < 6; i++) {
      const a = rand() * TAU;
      let x = Math.cos(a) * R * 0.98, y = Math.sin(a) * R * 0.98, h = a + Math.PI + (rand() - 0.5) * 0.8;
      const pts = [[x, y]];
      const n = 5 + Math.floor(rand() * 5);
      for (let k = 0; k < n; k++) {
        h += (rand() - 0.5) * 0.9; const st = 4 + rand() * 7;
        x += Math.cos(h) * st; y += Math.sin(h) * st; pts.push([x, y]);
      }
      [['rgba(255,255,255,0.9)', 1.6, 0.5], ['rgba(84,140,172,0.42)', 0.9, 0]].forEach(([col, w, off]) => {
        g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round';
        g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0] + off, p[1] + off) : g.moveTo(p[0] + off, p[1] + off)); g.stroke();
      });
    }
    // Speckle: frost grains.
    for (let i = 0; i < 360; i++) {
      const a = rand() * TAU, d = Math.sqrt(rand()) * R;
      g.fillStyle = 'rgba(90,140,175,' + (0.06 + rand() * 0.12) + ')';
      g.fillRect(Math.cos(a) * d, Math.sin(a) * d, 0.5 + rand() * 0.9, 0.5 + rand() * 0.9);
    }
    // The rim: a rounded bevel — shaded inner ring, a lit arc upper-left.
    const bev = g.createRadialGradient(0, 0, R - 11, 0, 0, R);
    bev.addColorStop(0, 'rgba(150,200,222,0)');
    bev.addColorStop(0.7, 'rgba(150,200,222,0.35)');
    bev.addColorStop(1, 'rgba(96,160,192,0.85)');
    g.fillStyle = bev; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, R - 3.4, Math.PI * 1.02, Math.PI * 1.72); g.stroke();
    g.restore();
    g.strokeStyle = '#4f93b3'; g.lineWidth = 1.3;
    g.beginPath(); g.arc(0, 0, R - 0.6, 0, TAU); g.stroke();
    f.canvas = c;
  }

  // Paint a mark into the surface (world coordinates). Marks are the Floe-Off's
  // story: every belly-slide leaves a groove, every Snowball a splat.
  function groove(g, pts, w) {
    if (!pts || pts.length < 2) return;
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = () => { g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); };
    path(); g.strokeStyle = 'rgba(112,168,200,0.22)'; g.lineWidth = w || 8; g.stroke();
    g.translate(-0.8, -1.2);
    path(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = (w || 8) * 0.22; g.stroke();
    g.restore();
  }

  function floeMark(f, kind, a, b) {
    if (!f || !f.canvas) return;
    const g = f.canvas.getContext('2d');
    const S = f.canvas.width, Q = f.q;
    g.setTransform(Q, 0, 0, Q, S / 2 - f.cx * Q, S / 2 - f.cy * Q);
    g.save();
    g.beginPath(); g.arc(f.cx, f.cy, f.radius - 1, 0, TAU); g.clip();
    if (kind === 'groove') {
      groove(g, a, b);                               // a = [{x,y}…] one slide's path, b = width
    } else if (kind === 'splat') {
      const R = rng(Math.round(a.x * 13 + a.y * 7));
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (let k = 0; k < 7; k++) {
        const an = R() * TAU, d = R() * 5;
        g.beginPath(); g.arc(a.x + Math.cos(an) * d, a.y + Math.sin(an) * d, 1.5 + R() * 2.5, 0, TAU); g.fill();
      }
      g.strokeStyle = 'rgba(110,160,190,0.25)'; g.lineWidth = 0.8;
      g.beginPath(); g.arc(a.x, a.y, 6.5, 0, TAU); g.stroke();
    }
    g.restore();
  }

  // The floe in the scene: the underwater skirt, the foam, the slab.
  function floe(ctx, f, t, reduced) {
    const R = f.radius, cx = f.cx, cy = f.cy;
    // Submerged ice: a pale teal skirt fading out under the water.
    const sk = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R + 26);
    sk.addColorStop(0, 'rgba(160,226,240,0.55)');
    sk.addColorStop(0.45, 'rgba(120,205,228,0.28)');
    sk.addColorStop(1, 'rgba(90,180,210,0)');
    ctx.fillStyle = sk; ctx.beginPath(); ctx.arc(cx, cy, R + 26, 0, TAU); ctx.fill();
    // Slab thickness: a darker lip offset downward, like the side of a cake.
    ctx.fillStyle = '#5aa3c2';
    ctx.beginPath(); ctx.arc(cx, cy + 3.2, R, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(30,90,125,0.45)';
    ctx.beginPath(); ctx.arc(cx, cy + 4.6, R - 0.5, 0.05 * Math.PI, 0.95 * Math.PI); ctx.lineTo(cx, cy); ctx.fill();
    // Foam lapping at the edge: blobs that breathe in turn.
    const tt = reduced ? 0 : t;
    [[3.2, 5.2, 0.62, 1.0], [1.6, 1.6, 0.95, 1.3], [8.5, 2.0, 0.3, -0.7]].forEach(([off, lw, al, sp]) => {
      ctx.beginPath();
      for (let k = 0; k <= 180; k++) {
        const a = k / 180 * TAU;
        const w = Math.sin(a * 9 + tt * 1.6 * sp) * 1.1 + Math.sin(a * 23 - tt * 2.3 * sp) * 0.6;
        const d = R + off + w;
        const x = cx + Math.cos(a) * d, y = cy + 2 + Math.sin(a) * d;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,' + al + ')'; ctx.lineWidth = lw; ctx.stroke();
    });
    for (let k = 0; k < 22; k++) {
      const a = hash(k * 4.1) * TAU + tt * 0.02 * (k % 2 ? 1 : -1);
      const w = reduced ? 0.5 : Math.sin(tt * 1.4 + k * 2.2) * 0.5 + 0.5;
      const d = R + 4 + hash(k * 9.3) * 6;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * w) + ')';
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + 2 + Math.sin(a) * d, 1 + w * 1.4, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy + 2, R + 8 + (reduced ? 0 : Math.sin(t * 0.9) * 1.6), 0, TAU); ctx.stroke();
    // The surface.
    if (f.canvas) {
      const S = f.canvas.width / f.q;
      ctx.drawImage(f.canvas, cx - S / 2, cy - S / 2, S, S);
    } else {
      ctx.fillStyle = '#eef7fb'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    }
    // Sparkles: frost catching the sun.
    if (!reduced) f.sparkles.forEach(s => {
      const v = Math.pow(Math.max(0, Math.sin(t * 1.3 + s.ph)), 12);
      if (v < 0.05) return;
      ctx.save(); ctx.translate(s.x, s.y); ctx.globalAlpha = v;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      const L = 2.4 * s.s, w = 0.45 * s.s;
      ctx.moveTo(0, -L); ctx.lineTo(w, -w); ctx.lineTo(L, 0); ctx.lineTo(w, w);
      ctx.lineTo(0, L); ctx.lineTo(-w, w); ctx.lineTo(-L, 0); ctx.lineTo(-w, -w); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // THE DRINK — deep teal, lighter over the submerged ice, wavelets that drift
  // and catch the light. `view` is the visible region in world units.
  // ═════════════════════════════════════════════════════════════════════════
  function water(ctx, view, t, cx, cy, R, reduced) {
    const g = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R + 360);
    g.addColorStop(0, '#3897bb');
    g.addColorStop(0.18, '#257ca3');
    g.addColorStop(0.5, '#16557c');
    g.addColorStop(1, '#0b3252');
    ctx.fillStyle = g;
    ctx.fillRect(view.x - 2, view.y - 2, view.w + 4, view.h + 4);
    const cell = 30, drift = reduced ? 0 : t * 5;
    const x0 = Math.floor((view.x - drift) / cell) - 1, x1 = Math.ceil((view.x + view.w - drift) / cell) + 1;
    const y0 = Math.floor(view.y / cell) - 1, y1 = Math.ceil((view.y + view.h) / cell) + 1;
    ctx.lineCap = 'round';
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
      const h1 = hash(i * 91.7 + j * 13.3), h2 = hash(i * 17.9 + j * 71.1), h3 = hash(i * 5.3 + j * 3.1);
      const x = i * cell + h1 * cell + drift, y = j * cell + h2 * cell;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < (R + 10) * (R + 10)) continue;
      const a = reduced ? 0.16 : 0.08 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.25 + h3 * TAU));
      const L = 6 + h3 * 7;
      ctx.strokeStyle = 'rgba(210,240,250,' + a + ')';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - L, y);
      ctx.quadraticCurveTo(x - L / 2, y - 2.2, x, y);
      ctx.quadraticCurveTo(x + L / 2, y + 2.2, x + L, y);
      ctx.stroke();
      if (!reduced && h1 > 0.86) {
        const v = Math.pow(Math.max(0, Math.sin(t * 2.1 + h2 * 20)), 16);
        if (v > 0.05) {
          ctx.fillStyle = 'rgba(255,255,255,' + v + ')';
          ctx.beginPath(); ctx.arc(x + L * 0.3, y - 1, 1.3, 0, TAU); ctx.fill();
        }
      }
    }
  }

  // Far-off floes drifting past — scenery, never a body.
  function scenery(ctx, view, t, cx, cy, R, reduced) {
    const n = 6;
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + 0.4 + (reduced ? 0 : t * 0.006);
      const d = R + 150 + hash(k * 3.3) * 170;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, s = 9 + hash(k * 7.7) * 16;
      if (x < view.x - s * 2 || x > view.x + view.w + s * 2 || y < view.y - s * 2 || y > view.y + view.h + s * 2) continue;
      ctx.fillStyle = 'rgba(150,215,235,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y + 3, s * 1.25, s * 0.9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5aa3c2';
      ctx.beginPath(); ctx.ellipse(x, y + 1.6, s, s * 0.66, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eef8fc';
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.66, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(x, y + 2, s + 2.5, s * 0.66 + 2, 0, 0, TAU); ctx.stroke();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // A CHUNK OF THE RING (a Berg) — a bevelled ice block with a snow cap; its
  // cracks read the hits it has left, so a chunk about to go LOOKS about to go.
  // ═════════════════════════════════════════════════════════════════════════
  function berg(ctx, b, maxHits, t) {
    const r = b.r, R = rng(Math.round(b.angle * 1000) + 17);
    const n = 6, pts = [];
    for (let k = 0; k < n; k++) {
      const a = b.angle + k / n * TAU + (R() - 0.5) * 0.55;
      const d = r * (0.74 + R() * 0.26);
      pts.push([Math.cos(a) * d, Math.sin(a) * d * 0.86]);
    }
    const h = r * (0.36 + R() * 0.14);
    ctx.save();
    ctx.translate(b.x, b.y);
    // Shadow on the ice.
    ctx.fillStyle = 'rgba(40,90,125,0.20)';
    ctx.beginPath(); pts.forEach((p, k) => k ? ctx.lineTo(p[0] + 2, p[1] + 3) : ctx.moveTo(p[0] + 2, p[1] + 3)); ctx.closePath(); ctx.fill();
    // Sides: every edge facing the viewer becomes a translucent face.
    for (let k = 0; k < n; k++) {
      const p = pts[k], q = pts[(k + 1) % n];
      const nx = q[1] - p[1], ny = -(q[0] - p[0]);        // outward normal (clockwise polygon)
      if (ny <= 0) continue;
      const lit = Math.max(0, Math.min(1, 0.5 - nx / (Math.hypot(nx, ny) || 1) * 0.5));
      ctx.fillStyle = mix('#5aa7c8', '#9fdcef', lit);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.lineTo(q[0], q[1] - h); ctx.lineTo(p[0], p[1] - h);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - h * 0.15); ctx.lineTo((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - h * 0.8); ctx.stroke();
    }
    // Top face.
    const top = new Path2D();
    pts.forEach((p, k) => k ? top.lineTo(p[0], p[1] - h) : top.moveTo(p[0], p[1] - h));
    top.closePath();
    const tg = ctx.createLinearGradient(-r, -h - r, r, -h + r);
    tg.addColorStop(0, '#f6fcfe'); tg.addColorStop(1, '#bfe4f2');
    ctx.fillStyle = tg; ctx.fill(top);
    // Snow cap.
    ctx.fillStyle = '#ffffff';
    const capA = R() * TAU, capW = 0.42 + R() * 0.2;
    ctx.save(); ctx.clip(top);
    ctx.beginPath(); ctx.ellipse(Math.cos(capA) * r * 0.12, -h + Math.sin(capA) * r * 0.1 - r * 0.06, r * capW, r * capW * 0.7, capA, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,175,205,0.35)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(Math.cos(capA) * r * 0.12, -h + Math.sin(capA) * r * 0.1 - r * 0.02, r * capW, r * capW * 0.7, capA, 0.2, Math.PI * 0.8); ctx.stroke();
    ctx.restore();
    // Damage: one crack per hit taken, deterministic from the chunk's angle.
    const taken = Math.max(0, (maxHits || 2) - b.hits);
    for (let k = 0; k < taken; k++) {
      const a = b.angle + k * 2.1;
      ctx.strokeStyle = 'rgba(40,95,130,0.75)'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
      ctx.beginPath();
      let x = Math.cos(a) * r * 0.75, y = Math.sin(a) * r * 0.6 - h;
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x -= Math.cos(a + (R() - 0.5)) * r * 0.4; y -= Math.sin(a + (R() - 0.5)) * r * 0.32; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    if (b.hits === 1 && maxHits > 1) {
      ctx.fillStyle = 'rgba(40,95,130,0.18)';
      ctx.fill(top);
    }
    // Ink: the silhouette.
    ctx.strokeStyle = 'rgba(43,42,56,0.7)'; ctx.lineWidth = 0.9; ctx.lineJoin = 'round';
    ctx.stroke(top);
    for (let k = 0; k < n; k++) {
      const p = pts[k], q = pts[(k + 1) % n];
      if (-(q[0] - p[0]) <= 0) continue;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < n; k++) {
      const p = pts[k], q = pts[(k + 1) % n];
      if (!(q[1] - p[1] < 0 && -(q[0] - p[0]) < 0)) continue;   // outward normal up-left
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - h - 0.6); ctx.lineTo(q[0], q[1] - h - 0.6); ctx.stroke();
    }
    ctx.restore();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // AIMING — no stick. A tether from the penguin back to your finger (you are
  // pulling it back), a fat arrow for where and how hard, and a dotted guide to
  // the first contact. All in YOUR colour.
  //   o = { x, y, r, dx, dy, power, tint, live, rival, locked, finger, guide, t, px, reduced }
  // ═════════════════════════════════════════════════════════════════════════
  function aim(ctx, o) {
    const len = Math.hypot(o.dx, o.dy) || 1, ux = o.dx / len, uy = o.dy / len, nx = -uy, ny = ux;
    const p = Math.max(0, Math.min(1, o.power)), r = o.r, px = o.px || 1;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Guide first, under the arrow.
    if (o.guide) {
      const g = o.guide, gx = g.end.x - o.x, gy = g.end.y - o.y, gl = Math.hypot(gx, gy);
      const step = 7;
      for (let s = r + 6; s < gl; s += step) {
        ctx.beginPath(); ctx.arc(o.x + ux * s, o.y + uy * s, 1.7, 0, TAU);
        ctx.fillStyle = alpha(o.tint, o.rival ? 0.55 : 0.95); ctx.fill();
        ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(43,42,56,0.45)'; ctx.stroke();
      }
      if (g.ghost) {
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.8; ctx.strokeStyle = alpha(o.tint, 0.95);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(g.ghost.x, g.ghost.y + 0.08 * r, 1.05 * r, 0.62 * r, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
      } else if (g.kind === 'rim') {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(g.end.x, g.end.y, 6, 3, 0, 0, TAU); ctx.stroke();
      }
      if (g.stub) {
        const sx = g.stub.x2 - g.stub.x1, sy = g.stub.y2 - g.stub.y1, sl = Math.hypot(sx, sy) || 1;
        const vx = sx / sl, vy = sy / sl;
        ctx.strokeStyle = INK; ctx.lineWidth = 4.2;
        ctx.beginPath(); ctx.moveTo(g.stub.x1, g.stub.y1); ctx.lineTo(g.stub.x2, g.stub.y2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g.stub.x2 + vx * 5, g.stub.y2 + vy * 5);
        ctx.lineTo(g.stub.x2 - vy * 4, g.stub.y2 + vx * 4);
        ctx.lineTo(g.stub.x2 + vy * 4, g.stub.y2 - vx * 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // The tether: you are pulling the penguin back towards your finger.
    if (o.live && o.finger) {
      const fx = o.finger.x, fy = o.finger.y;
      const bx = o.x - ux * r * 0.9, by = o.y - uy * r * 0.9;
      ctx.setLineDash([2.5, 3.5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = alpha(o.tint, 0.95); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.setLineDash([]);
      const gr = Math.max(7, 12 / px);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(fx, fy, gr, 0, TAU); ctx.fill();
      ctx.lineWidth = Math.max(1.6, 2.5 / px); ctx.strokeStyle = o.tint; ctx.stroke();
    }
    // The arrow.
    if (p >= 0.02) {
      const pulse = (p > 0.97 && !o.reduced && o.live) ? 1 + Math.sin(o.t * 22) * 0.05 : 1;
      const L = (14 + 70 * p) * pulse, w = 2.4 + 2.6 * p, hw = w + 4.8, hl = 11;
      const b0 = r + 3;
      const X = (a, s) => o.x + ux * a + nx * s, Y = (a, s) => o.y + uy * a + ny * s;
      const path = new Path2D();
      path.moveTo(X(b0, w * 0.7), Y(b0, w * 0.7));
      path.lineTo(X(b0 + L - hl, w), Y(b0 + L - hl, w));
      path.lineTo(X(b0 + L - hl, hw), Y(b0 + L - hl, hw));
      path.lineTo(X(b0 + L, 0), Y(b0 + L, 0));
      path.lineTo(X(b0 + L - hl, -hw), Y(b0 + L - hl, -hw));
      path.lineTo(X(b0 + L - hl, -w), Y(b0 + L - hl, -w));
      path.lineTo(X(b0, -w * 0.7), Y(b0, -w * 0.7));
      path.closePath();
      ctx.globalAlpha *= o.rival ? 0.55 : (o.live ? 1 : 0.85);
      ctx.lineWidth = 3.6; ctx.strokeStyle = 'rgba(43,42,56,0.55)'; ctx.stroke(path);
      const gr = ctx.createLinearGradient(X(b0, 0), Y(b0, 0), X(b0 + L, 0), Y(b0 + L, 0));
      gr.addColorStop(0, lighten(o.tint, 0.45));
      gr.addColorStop(0.6, o.tint);
      gr.addColorStop(1, darken(o.tint, 0.12 + 0.18 * p));
      ctx.fillStyle = gr; ctx.fill(path);
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff';
      if (o.rival) ctx.setLineDash([3, 3]);
      ctx.stroke(path);
      ctx.setLineDash([]);
      // Chevrons flowing to the tip while you hold it.
      if (o.live && !o.reduced && L > 30) {
        ctx.save(); ctx.clip(path);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6;
        for (let k = 0; k < 4; k++) {
          const s = b0 + ((o.t * 38 + k * 14) % (L - 6));
          ctx.beginPath();
          ctx.moveTo(X(s - 3, w), Y(s - 3, w)); ctx.lineTo(X(s, 0), Y(s, 0)); ctx.lineTo(X(s - 3, -w), Y(s - 3, -w));
          ctx.stroke();
        }
        ctx.restore();
      }
      if (o.locked) {
        // A padlock nub at the tail: the power is set, you're only steering.
        const lx = X(b0 - 2, 0), ly = Y(b0 - 2, 0);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Where your Snowball will land: your colour, a throw arc from your flipper.
  function reticle(ctx, o) {
    const t = o.t || 0, s = 1 + (o.reduced ? 0 : Math.sin(t * 5) * 0.07);
    ctx.save();
    ctx.lineCap = 'round';
    if (o.from) {
      const mx = (o.from.x + o.x) / 2, my = (o.from.y + o.y) / 2;
      const d = Math.hypot(o.x - o.from.x, o.y - o.from.y);
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(o.from.x, o.from.y - 18); ctx.quadraticCurveTo(mx, my - d * 0.45, o.x, o.y); ctx.stroke();
      ctx.strokeStyle = o.tint; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.translate(o.x, o.y); ctx.scale(s, s * 0.62);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke();
    ctx.strokeStyle = o.tint; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.rotate(o.reduced ? 0 : t * 0.8);
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(18, 0); ctx.stroke();
      ctx.strokeStyle = o.tint; ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.fillStyle = o.tint;
    ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // A free gap to Dive into: a dashed ring bobbing in the water, in your colour.
  function seat(ctx, x, y, r, tint, t, chosen) {
    const b = Math.sin(t * 2.4 + x * 0.1) * 0.8;
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = chosen ? 2.4 : 1.8;
    ctx.strokeStyle = chosen ? tint : 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(x, y + b, 1.1 * r, 0.55 * r, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // A Snowball in flight: `k` 0..1 along its throw; it rises and falls over a
  // shadow that travels straight across the ice.
  function snowball(ctx, from, to, k, r) {
    const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k;
    const d = Math.hypot(to.x - from.x, to.y - from.y);
    const h = Math.sin(k * Math.PI) * Math.min(60, d * 0.35) + (1 - k) * 18;
    ctx.save();
    ctx.fillStyle = 'rgba(30,70,100,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.45, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - h, r * 0.8, 0, TAU);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = 'rgba(140,190,215,0.6)';
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - h + r * 0.25, r * 0.35, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PARTICLES — the caller owns the instance. Under reduced motion nothing is
  // spawned that travels (ui-style.md § Motion Standard: show the end, skip
  // the journey); the splash still leaves its ring.
  // ═════════════════════════════════════════════════════════════════════════
  function makeFx() {
    const P = [];
    let reduced = false;
    function add(p) { if (P.length < 420) P.push(p); }
    const fx = {
      setReduced(v) { reduced = !!v; },
      clear() { P.length = 0; },
      count() { return P.length; },
      spray(x, y, vx, vy, n) {                       // snow kicked up by a belly-slide
        if (reduced) return;
        for (let i = 0; i < (n || 2); i++) add({ k: 'snow', x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
          z: 0, vx: -vx * 0.25 + (Math.random() - 0.5) * 30, vy: -vy * 0.25 + (Math.random() - 0.5) * 30,
          vz: 18 + Math.random() * 25, life: 0, max: 0.45 + Math.random() * 0.3, s: 1 + Math.random() * 1.6 });
      },
      puff(x, y, power) {                            // a bump between two penguins
        const n = reduced ? 0 : 5 + Math.round(power * 6);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU, v = 20 + Math.random() * 50 * power;
          add({ k: 'puff', x: x, y: y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: 10,
                life: 0, max: 0.35 + Math.random() * 0.25, s: 2.5 + Math.random() * 2.5 });
        }
        if (!reduced && power > 0.35) for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i - 1) * 0.8;
          add({ k: 'star', x: x, y: y - 8, z: 0, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, vz: 0,
                life: 0, max: 0.5, s: 3 + power * 2, rot: Math.random() * TAU });
        }
      },
      splash(x, y, power) {                          // into the Drink
        add({ k: 'ring', x: x, y: y, life: 0, max: 1.1, s: 8 });
        add({ k: 'ring', x: x, y: y, life: -0.18, max: 1.2, s: 5 });
        if (reduced) return;
        const n = 12 + Math.round((power || 1) * 8);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU, v = 25 + Math.random() * 45;
          add({ k: 'drop', x: x, y: y, z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6,
                vz: 60 + Math.random() * 70, life: 0, max: 1.4, s: 1.2 + Math.random() * 1.8 });
        }
      },
      shatter(x, y) {                                // a chunk goes
        add({ k: 'ring', x: x, y: y, life: 0, max: 1, s: 10 });
        if (reduced) return;
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * TAU, v = 30 + Math.random() * 60;
          add({ k: 'shard', x: x, y: y, z: 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: 40 + Math.random() * 60,
                life: 0, max: 1.2, s: 2 + Math.random() * 3.5, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12 });
        }
      },
      landing(x, y) {                                // a Snowball arrives
        if (reduced) return;
        for (let i = 0; i < 9; i++) {
          const a = Math.random() * TAU, v = 20 + Math.random() * 40;
          add({ k: 'snow', x: x, y: y, z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: 30 + Math.random() * 30,
                life: 0, max: 0.6, s: 1.2 + Math.random() * 1.6 });
        }
      },
      step(dt) {
        for (let i = P.length - 1; i >= 0; i--) {
          const p = P[i];
          p.life += dt;
          if (p.life < 0) continue;
          if (p.life >= p.max) { P.splice(i, 1); continue; }
          if (p.vx !== undefined) {
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= 0.94; p.vy *= 0.94;
            if (p.vz !== undefined) { p.z += p.vz * dt; p.vz -= 220 * dt; if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.6; p.vy *= 0.6; } }
            if (p.vr) p.rot += p.vr * dt;
          }
        }
      },
      draw(ctx, layer) {
        P.forEach(p => {
          if (p.life < 0) return;
          const k = p.life / p.max;
          if (layer === 'ground' && p.k === 'ring') {
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)) + ')';
            ctx.lineWidth = 2 * (1 - k) + 0.5;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s + k * 26, (p.s + k * 26) * 0.5, 0, 0, TAU); ctx.stroke();
          }
          if (layer !== 'air') return;
          if (p.k === 'snow' || p.k === 'drop') {
            ctx.fillStyle = p.k === 'snow' ? 'rgba(255,255,255,' + (1 - k) + ')' : 'rgba(220,245,255,' + (1 - k * 0.7) + ')';
            ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.s, 0, TAU); ctx.fill();
          } else if (p.k === 'puff') {
            ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - k)) + ')';
            ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.s * (1 + k * 1.2), 0, TAU); ctx.fill();
          } else if (p.k === 'star') {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + k * 3);
            ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff6c9'; ctx.strokeStyle = INK; ctx.lineWidth = 0.7;
            ctx.beginPath();
            for (let s = 0; s < 10; s++) { const rr = s % 2 ? p.s * 0.45 : p.s; const a = s / 10 * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
            ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
          } else if (p.k === 'shard') {
            ctx.save(); ctx.translate(p.x, p.y - p.z); ctx.rotate(p.rot);
            ctx.globalAlpha = 1 - k; ctx.fillStyle = '#d5f0f9'; ctx.strokeStyle = '#4f93b3'; ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.lineTo(0, -p.s * 0.6); ctx.lineTo(p.s * 0.8, p.s * 0.3); ctx.closePath();
            ctx.fill(); ctx.stroke(); ctx.restore();
          }
        });
      },
    };
    return fx;
  }

  window.CldArt = {
    penguin: penguin, posePars: posePars, meMarker: meMarker, groove: groove,
    makeFloe: makeFloe, paintFloe: paintFloe, floeMark: floeMark, floe: floe,
    water: water, scenery: scenery, berg: berg,
    aim: aim, reticle: reticle, seat: seat, snowball: snowball,
    makeFx: makeFx,
    lighten: lighten, darken: darken, mix: mix, INK: INK,
  };
})();
