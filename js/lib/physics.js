// ═══════════════════════════════════════════════════════════════════════════
// physics.js — deterministic 2-D circle simulation inside a circular arena
// Exposed as window.Physics
// API:    Physics.simulate(config) → { samples, events, final, durationMs, capped }
//         Physics.rng(seed)        → () => float in [0,1)  (xorshift32)
//
// THE BOUNDARY (Cold Shoulder tech spec §4A — the most important line in this file):
//   no DOM, no canvas, no `window` reads, no Date.now(), no bare Math.random().
//   Same inputs → byte-identical output, on any device, in any process.
//   Randomness enters ONLY through `seed`.
//
// What this module owns: integration, Coulomb friction, circle–circle collision,
// restitution, immovable bodies, the arena boundary, breakable bodies (Bergs),
// scheduled point impulses (Snowballs), rest detection and the time cap.
//
// What it does NOT own: Berth geometry, Berth assignment, the multi-hop shunt,
// Dive legality, The Thaw's radius schedule, Ice Conditions mapping, Berg
// PLACEMENT, scoring, and every pixel. Those are game rules and live in cld.js.
//
// The clean seam: a body that leaves the arena is only ever REPORTED as plunged,
// with its exit velocity. Deciding what that means happens outside, between runs.
// ═══════════════════════════════════════════════════════════════════════════

(function () {

  // ── Defaults ──────────────────────────────────────────────────────────────
  // `decel` has no default — Coulomb deceleration is the caller's whole tuning
  // surface (Ice Conditions) and a silent fallback would hide a wiring mistake.
  const DEFAULTS = {
    substepMs:          1000 / 120,  // fixed substep. NEVER a variable dt.
    capMs:              5000,
    sampleHz:           20,
    restEps:            1.5,         // logical units/s
    restSteps:          3,           // K consecutive slow substeps → clamp to exact zero
    bergRestitution:    0.55,        // ≤ 1 — cushioned
    drownedRestitution: 1.35,        // > 1 — energetic
    contactIters:       2,           // positional de-overlap passes per substep
  };

  const PENGUIN_RESTITUTION = 1;

  // ── Seeded RNG — xorshift32 ───────────────────────────────────────────────
  // Exported so callers needing a seeded pick (Berth slots, Berg placement) use
  // this one rather than re-implementing a second, silently different generator.
  function rng(seed) {
    let s = (seed >>> 0) || 0x9E3779B9;
    function step() {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;  s >>>= 0;
      return s;
    }
    // WARM-UP, and it is load-bearing. Raw xorshift32 has almost no avalanche
    // on a small state: seeds 1..40 all return a FIRST draw below 0.0025, so a
    // caller that seeds and immediately takes one draw gets the same answer for
    // every one of them. cld.js's Berth-slot pick is exactly that caller, and a
    // "seeded pick" that always lands on slot 0 is indistinguishable from no
    // pick at all. Four steps is past the point where the first draw is uniform
    // (chi-square over 100k seeds, 10 bins: 0.0 on 9 df).
    for (let i = 0; i < 4; i++) step();
    return function () { return step() / 4294967296; };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function kindRestitution(kind, p) {
    if (kind === 'drowned') return p.drownedRestitution;
    if (kind === 'berg')    return p.bergRestitution;
    return PENGUIN_RESTITUTION;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // simulate — one pure, total function
  // ═════════════════════════════════════════════════════════════════════════
  function simulate(cfg) {
    const world = cfg.world;
    const p     = Object.assign({}, DEFAULTS, cfg.params || {});
    const rand  = rng(cfg.seed);

    if (!(p.decel > 0)) throw new Error('Physics.simulate: params.decel must be a positive number');

    const dt       = p.substepMs / 1000;
    const drop     = p.decel * dt;                  // speed lost per substep (Coulomb)
    const maxSteps = Math.max(1, Math.ceil(p.capMs / p.substepMs));
    const stride   = Math.max(1, Math.round(1000 / (p.sampleHz * p.substepMs)));
    const sampleMs = stride * p.substepMs;

    // ── Bodies ──────────────────────────────────────────────────────────────
    // `kind` drives the two defaults a caller would otherwise repeat on every
    // body: immovability and restitution. Both stay explicitly overridable.
    const bodies = (cfg.bodies || []).map(function (b) {
      const kind = b.kind || 'penguin';
      const immovable = (b.immovable === undefined) ? (kind !== 'penguin') : !!b.immovable;
      return {
        id:        b.id,
        kind:      kind,
        x:         b.x,
        y:         b.y,
        vx:        0,
        vy:        0,
        r:         b.r,
        invM:      immovable ? 0 : 1,
        rest:      (b.restitution === undefined) ? kindRestitution(kind, p) : b.restitution,
        hits:      (b.hits === undefined) ? null : b.hits,
        active:    true,
        lowCount:  0,
        plunged:   false,
        shattered: false,
        exitVx:    0,
        exitVy:    0,
      };
    });
    const n = bodies.length;
    const byId = new Map();
    for (let i = 0; i < n; i++) byId.set(bodies[i].id, bodies[i]);

    // ── Impulses — all applied at t = 0 ─────────────────────────────────────
    const impulses = cfg.impulses || [];
    for (let k = 0; k < impulses.length; k++) {
      const b = byId.get(impulses[k].bodyId);
      if (!b || b.invM === 0) continue;             // immovable bodies take no impulse
      b.vx += impulses[k].vx;
      b.vy += impulses[k].vy;
    }

    // ── Scheduled events — landing order, stable on ties ────────────────────
    const queue = (cfg.events || [])
      .map(function (e, i) { return { e: e, i: i }; })
      .sort(function (a, b) { return (a.e.t - b.e.t) || (a.i - b.i); })
      .map(function (w) { return w.e; });
    let evPtr = 0;

    const samples = [];
    const out     = [];   // resolved event list, chronological

    function pushFrame() {
      const f = new Array(n * 2);
      for (let i = 0; i < n; i++) {
        f[i * 2]     = Math.round(bodies[i].x);
        f[i * 2 + 1] = Math.round(bodies[i].y);
      }
      samples.push(f);
    }

    function damageBerg(berg, t, cause) {
      berg.hits -= 1;
      if (berg.hits <= 0) {
        berg.hits      = 0;
        berg.active    = false;
        berg.shattered = true;
        out.push({ t: t, type: 'shatter', id: berg.id, x: berg.x, y: berg.y, cause: cause });
      }
    }

    let steps  = 0;
    let capped = false;

    pushFrame();   // frame 0 — the pre-Slide state

    for (let step = 0; step < maxSteps; step++) {
      const tEnd   = (step + 1) * p.substepMs;
      const tStamp = Math.round(tEnd);

      // ── 1. Scheduled events landing in this window, IN LANDING ORDER ──────
      // Resolved one at a time against LIVE positions. Never summed, never
      // batched — an earlier landing that moves a target makes a later one miss.
      while (evPtr < queue.length && queue[evPtr].t < tEnd) {
        const ev = queue[evPtr++];
        if (ev.type !== 'snowball') continue;

        // A snowball is one object: it strikes the single nearest body it
        // overlaps, or nothing at all.
        let hit = null, hitD = Infinity;
        for (let i = 0; i < n; i++) {
          const b = bodies[i];
          if (!b.active) continue;
          const dx = b.x - ev.x, dy = b.y - ev.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d <= (ev.radius || 0) + b.r && d < hitD) { hit = b; hitD = d; }
        }

        const landing = { t: tStamp, type: 'landing', x: ev.x, y: ev.y, from: ev.from || null };
        if (!hit) {
          landing.hit = null;                             // open ice — the race-miss case
        } else if (hit.kind === 'berg') {
          landing.hit = 'berg'; landing.id = hit.id;
          damageBerg(hit, tStamp, 'snowball');            // one hit, regardless of range
        } else if (hit.invM === 0) {
          landing.hit = 'drowned'; landing.id = hit.id;   // nothing at all
        } else {
          landing.hit = 'penguin'; landing.id = hit.id;
          // Direction of travel: source → landing point. Falls back to a radial
          // shove, then to a seeded direction, so `force` is never silently lost.
          let dx, dy;
          if (ev.from) { dx = ev.x - ev.from.x; dy = ev.y - ev.from.y; }
          else         { dx = hit.x - ev.x;     dy = hit.y - ev.y; }
          let len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1e-9) { const a = rand() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); len = 1; }
          hit.vx += (dx / len) * ev.force;
          hit.vy += (dy / len) * ev.force;
          hit.lowCount = 0;
        }
        out.push(landing);
      }

      // ── 2. Coulomb friction, then integrate ──────────────────────────────
      // Velocity first, then position: this scheme UNDER-shoots the closed form
      // d = v0^2/(2a) by a factor (N-1)/N, so the minimum-radius invariant that
      // is computed FROM that closed form always has margin. Explicit Euler
      // over-shoots and would eat exactly that margin.
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (!b.active || b.invM === 0) continue;
        const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (sp <= drop) {
          b.vx = 0; b.vy = 0;                       // finite-time stop, exactly zero
        } else {
          const k = (sp - drop) / sp;
          b.vx *= k; b.vy *= k;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }

      // ── 3. Collisions ────────────────────────────────────────────────────
      for (let iter = 0; iter < p.contactIters; iter++) {
        for (let i = 0; i < n; i++) {
          const a = bodies[i];
          if (!a.active) continue;
          for (let j = i + 1; j < n; j++) {
            const b = bodies[j];
            if (!b.active) continue;
            if (a.invM === 0 && b.invM === 0) continue;   // two immovables never interact

            const dx = b.x - a.x, dy = b.y - a.y;
            let d = Math.sqrt(dx * dx + dy * dy);
            const minD = a.r + b.r;
            if (d >= minD) continue;

            let nx, ny;
            if (d < 1e-9) {                                // exactly concentric
              const ang = rand() * Math.PI * 2;
              nx = Math.cos(ang); ny = Math.sin(ang); d = 0;
            } else {
              nx = dx / d; ny = dy / d;
            }

            // Positional de-overlap — immovable bodies are never displaced.
            const overlap = minD - d;
            const invSum  = a.invM + b.invM;
            const sa = a.invM / invSum, sb = b.invM / invSum;
            a.x -= nx * overlap * sa; a.y -= ny * overlap * sa;
            b.x += nx * overlap * sb; b.y += ny * overlap * sb;

            // Impulse exchange — only while approaching.
            const vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vrel >= 0) continue;

            const e    = a.rest * b.rest;                  // the pair's restitution
            const jImp = -(1 + e) * vrel / invSum;
            a.vx -= jImp * a.invM * nx; a.vy -= jImp * a.invM * ny;
            b.vx += jImp * b.invM * nx; b.vy += jImp * b.invM * ny;
            a.lowCount = 0; b.lowCount = 0;

            const cx = a.x + nx * a.r, cy = a.y + ny * a.r;
            const speed = Math.abs(vrel);

            // A movable ↔ immovable hit is a REBOUND (its own beat and sound);
            // movable ↔ movable is a COLLISION.
            if (a.invM === 0 || b.invM === 0) {
              const anchor = (a.invM === 0) ? a : b;
              const mover  = (a.invM === 0) ? b : a;
              out.push({ t: tStamp, type: 'rebound', id: mover.id, off: anchor.kind,
                         offId: anchor.id, x: cx, y: cy, speed: speed });
              if (anchor.kind === 'berg') {
                // ONE rebound, ONE hit — emitted together so the two can never
                // drift apart. What makes that once-per-CONTACT rather than
                // once-per-substep is the `vrel >= 0` gate above: the impulse
                // leaves the pair separating, so an overlap persisting over
                // several substeps re-enters this branch exactly zero more
                // times. The hit that empties a Berg still cushions THIS
                // rebound; only LATER contacts pass through to open edge.
                damageBerg(anchor, tStamp, 'collision');
              }
            } else {
              out.push({ t: tStamp, type: 'collision', a: a.id, b: b.id,
                         x: cx, y: cy, speed: speed });
            }
          }
        }
      }

      // ── 4. Boundary — a centre past world.radius is a plunge ──────────────
      // Only movable bodies are tested: Drowned penguins and Bergs sit ON the
      // rim by design and must never plunge themselves.
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (!b.active || b.invM === 0) continue;
        const dx = b.x - world.cx, dy = b.y - world.cy;
        if (dx * dx + dy * dy <= world.radius * world.radius) continue;
        b.active  = false;
        b.plunged = true;
        b.exitVx  = b.vx;
        b.exitVy  = b.vy;
        out.push({ t: tStamp, type: 'plunge', id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy });
      }

      // ── 5. Rest detection ────────────────────────────────────────────────
      let moving = false;
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (!b.active || b.invM === 0) continue;
        const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (sp < p.restEps) {
          if (++b.lowCount >= p.restSteps) { b.vx = 0; b.vy = 0; }
        } else {
          b.lowCount = 0;
        }
        if (b.vx !== 0 || b.vy !== 0) moving = true;
      }

      steps = step + 1;
      if (steps % stride === 0) pushFrame();

      // A pending event keeps the sim alive even when everything is at rest —
      // a snowball still in flight must be allowed to land.
      if (!moving && evPtr >= queue.length) break;

      if (steps === maxSteps) {
        // The cap is enforced HERE, never by the caller: it is what bounds the
        // broadcast payload. Every still-moving body is forced to rest.
        capped = true;
        for (let i = 0; i < n; i++) { bodies[i].vx = 0; bodies[i].vy = 0; }
      }
    }

    if (steps % stride !== 0) pushFrame();   // land playback on a sample boundary

    const final = bodies.map(function (b) {
      // vx/vy are the resting velocity — zero for every body that reached rest
      // or was forced there by the cap, and the frozen exit velocity for one
      // that plunged. exitVx/exitVy stay the documented plunge-only fields the
      // Berth shunt tie-break reads (§4C).
      const f = { id: b.id, x: b.x, y: b.y, plunged: b.plunged,
                  vx: b.vx, vy: b.vy, exitVx: b.exitVx, exitVy: b.exitVy };
      if (b.kind === 'berg') { f.hits = b.hits; f.shattered = b.shattered; }
      return f;
    });

    return {
      samples:    samples,
      events:     out,
      final:      final,
      durationMs: Math.round((samples.length - 1) * sampleMs),
      capped:     capped,
    };
  }

  window.Physics = {
    simulate: simulate,
    rng:      rng,
    DEFAULTS: DEFAULTS,
  };

})();
