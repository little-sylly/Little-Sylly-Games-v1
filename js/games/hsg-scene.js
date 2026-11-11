// ═══════════════════════════════════════════════════════════════════════════
// hsg-scene.js — Hide and Shogun's Storyteller (S5): the lamplit shoji, the
// rakugo teller on his cushion, his folding fan.
// Depends on: css/hsg.css (every class and keyframe below)
// Called by:  js/engine-intro.js (the Intro — through hsg.js's hsgIntroScene),
//             js/games/hsg.js (the Battle intro — its own instance)
//
// Game-owned and PURE (the dyb-dice.js / cld-art.js shape): inputs in, DOM out.
// It reads no hsg* state, calls no play*() (the game plays the fan snap — spec
// §9) and owns NO timers: every motion is a CSS keyframe or transition, timed by
// custom properties the caller sets on an ancestor (--hsg-snap, --hsg-bi-ms), so
// the sound the game schedules and the snap you see share one number. The only
// loop is the static-tier frame watch — one RAF burst, cancelled by stop().
//
//   HsgScene                 { mount(el, opts), beat(i, text), stop() } — the Intro's
//   HsgScene.make()          a fresh, independent instance (the Battle intro takes one,
//                            so the two can never stop each other)
//
//   mount(el, { reducedMotion, mode, toss })
//     mode 'battle'  the Battle intro's stage: the doors slide shut, the fan snaps
//                    (toss: true → Battle 1: he tosses it to see who goes first)
//     anything else  the Intro (the engine passes 'ptp' | 'host' | 'client'): a line
//                    card under the stage; beat(i, text) lifts the fan per line,
//                    beat(-1, '') snaps it shut
//
// Tiers (docs/rules/ui-revamp.md § 4): reduced motion → the static tier always
// (.is-reduced: final pose at once, nothing loops). The automatic static tier
// (.is-static) after ~30 slow frames stops the loops — the lamp's flicker — and
// holds the fan still; a one-shot (a door sliding, the snap) still finishes.
// No WebGL, no image files: inline SVG + CSS.
// ═══════════════════════════════════════════════════════════════════════════

function hsgSceneMake() {
  let root = null, line = null, raf = 0, lastBeat = null;
  // Gradient ids must be unique per instance: two stages can be in the DOM at once
  // (the Intro tearing down while the Battle intro mounts).
  const uid = 'hsgs' + (++hsgSceneMake.n);

  // The stage: 315 × 262 user units (the board "A · Battle intro"). The shoji is two
  // sliding panes clipped to the frame; the Storyteller is a nested <svg> so CSS
  // transform-origins below are in HIS coordinates (the board's 200 × 214 figure).
  function stageSvg() {
    const pane = (x0, x1, cls) => {
      let bars = '';
      for (let x = x0 + 50; x < x1 - 10; x += 50) bars += '<rect x="' + (x - 1.5) + '" y="7" width="3" height="200" fill="#3A1F1A"/>';
      [57, 107, 157].forEach(y => { bars += '<rect x="' + x0 + '" y="' + (y - 1.5) + '" width="' + (x1 - x0) + '" height="3" fill="#3A1F1A"/>'; });
      return '<g class="' + cls + '"><rect x="' + x0 + '" y="7" width="' + (x1 - x0) + '" height="200" fill="url(#' + uid + 'p)"/>' + bars
           + '<rect x="' + (x1 - 2) + '" y="7" width="4" height="200" fill="#3A1F1A"/></g>';
    };
    return '<svg class="hsg-stage-svg" viewBox="0 0 315 262" role="img" aria-label="The Storyteller, kneeling on his cushion with his fan">'
      + '<defs>'
      +   '<radialGradient id="' + uid + 'p" gradientUnits="userSpaceOnUse" cx="157.5" cy="133" r="190">'
      +     '<stop offset="0" stop-color="#FFE7B3"/><stop offset=".4" stop-color="#F6E3BE"/><stop offset=".78" stop-color="#E6D2AA"/><stop offset="1" stop-color="#D4BC90"/></radialGradient>'
      +   '<radialGradient id="' + uid + 'g"><stop offset="0" stop-color="#FFF3D1" stop-opacity=".85"/><stop offset="1" stop-color="#FFF3D1" stop-opacity="0"/></radialGradient>'
      +   '<clipPath id="' + uid + 'c"><rect x="7" y="7" width="301" height="200"/></clipPath>'
      + '</defs>'
      // the frame's dark interior shows only while the panes are still apart
      + '<rect x="0" y="0" width="315" height="214" fill="#2A1712"/>'
      + '<g clip-path="url(#' + uid + 'c)">' + pane(7, 157.5, 'hsg-pane hsg-pane-l') + pane(157.5, 308, 'hsg-pane hsg-pane-r') + '</g>'
      + '<ellipse class="hsg-glow" cx="157.5" cy="128" rx="128" ry="86" fill="url(#' + uid + 'g)"/>'
      + '<rect x="4" y="4" width="307" height="206" fill="none" stroke="#3A1F1A" stroke-width="6"/>'
      + '<rect x="1" y="1" width="313" height="212" rx="2" fill="none" stroke="#C9A14A" stroke-width="2"/>'
      + '<svg x="57" y="46" width="200" height="216" viewBox="0 0 200 216" overflow="visible">'
      +   '<path d="M22 182 Q22 168 38 168 L162 168 Q178 168 178 182 L178 192 Q178 206 162 206 L38 206 Q22 206 22 192Z" fill="#8C5A2B" stroke="#2B2620" stroke-width="2"/>'
      +   '<g class="hsg-st-body">'
      +     '<path d="M46 174 Q40 130 62 110 Q78 98 100 98 Q122 98 138 110 Q160 130 154 174Z" fill="#2B2620"/>'
      +     '<path d="M58 172 Q54 132 72 114 Q84 104 96 102 L100 150 L104 102 Q116 104 128 114 Q146 132 142 172Z" fill="#6B3A2A"/>'
      +     '<path d="M92 100 L100 132 L108 100 L104 98 L100 116 L96 98Z" fill="#F3EAD7"/>'
      +     '<path d="M80 72 A20 20 0 1 0 120 72 A20 20 0 1 0 80 72Z" fill="#F3D9B5" stroke="#2B2620" stroke-width="2"/>'
      +     '<path d="M80 68 Q82 50 100 50 Q118 50 120 68 Q110 60 100 60 Q90 60 80 68Z" fill="#2B2620"/>'
      +     '<path d="M88 73 Q91.5 76.5 95 73 M105 73 Q108.5 76.5 112 73" fill="none" stroke="#2B2620" stroke-width="2" stroke-linecap="round"/>'
      +     '<path d="M93 82 Q100 89 107 82" fill="#2B2620" stroke="#2B2620" stroke-width="2" stroke-linejoin="round"/>'
      +     '<path d="M66 150 Q78 140 92 146 L88 156 Q76 152 70 158Z" fill="#F3D9B5" stroke="#2B2620" stroke-width="1.6"/>'
      +   '</g>'
      // the fan arm: rotates about the shoulder (136, 118)
      +   '<g class="hsg-st-arm">'
      +     '<path d="M132 112 Q150 100 154 76 L168 80 Q164 112 140 126Z" fill="#6B3A2A" stroke="#2B2620" stroke-width="1.6"/>'
      +     '<g class="hsg-fan-open">'
      +       '<path d="M161 68 L130 24 A54 54 0 0 1 198 36 Z" fill="#C9A14A" stroke="#2B2620" stroke-width="2" stroke-linejoin="round"/>'
      +       '<path d="M161 68 L141 21 M161 68 L153 19 M161 68 L165 20 M161 68 L177 24 M161 68 L188 29" stroke="#3A1F1A" stroke-width="1.4"/>'
      +     '</g>'
      +     '<path class="hsg-fan-shut" d="M161 68 L149 22 Q153 19 158 20 Z" fill="#C9A14A" stroke="#2B2620" stroke-width="2" stroke-linejoin="round"/>'
      +     '<path d="M154 70 A7 7 0 1 0 168 70 A7 7 0 1 0 154 70Z" fill="#F3D9B5" stroke="#2B2620" stroke-width="1.6"/>'
      +   '</g>'
      // Battle 1: the tossed fan, drawn where it ends up; CSS flies it there from the hand
      +   '<path class="hsg-fan-arc" d="M70 30 Q100 6 136 36 M64 44 Q94 22 128 48" fill="none" stroke="#F2B45A" stroke-width="2.2" stroke-dasharray="4 6" stroke-linecap="round"/>'
      +   '<g class="hsg-fan-air">'
      +     '<path d="M30 40 L10 6 A40 40 0 0 1 58 10 Z" fill="#C9A14A" stroke="#2B2620" stroke-width="2" stroke-linejoin="round"/>'
      +     '<path d="M30 40 L18 5 M30 40 L34 4 M30 40 L48 7" stroke="#3A1F1A" stroke-width="1.4"/>'
      +   '</g>'
      + '</svg>'
      + '</svg>';
  }

  // Replays a one-shot keyframe class (the suite's re-trigger pattern).
  function retrigger(el, cls) {
    if (!el || !el.classList) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // The automatic static tier: ~30 frames; a median over 22 ms stops the loops.
  function frameWatch() {
    if (typeof requestAnimationFrame !== 'function') return;
    const ts = [];
    let last = 0;
    const tick = t => {
      if (!root) { raf = 0; return; }
      if (last) ts.push(t - last);
      last = t;
      if (ts.length < 30) { raf = requestAnimationFrame(tick); return; }
      raf = 0;
      const med = ts.slice().sort((a, b) => a - b)[Math.floor(ts.length / 2)];
      if (med > 22) root.classList.add('is-static');
    };
    raf = requestAnimationFrame(tick);
  }

  const inst = {
    mount(el, opts) {
      inst.stop();
      if (!el) return;
      const o = opts || {};
      const battle = o.mode === 'battle';
      root = document.createElement('div');
      root.className = 'hsg-scene ' + (battle ? 'is-battle' + (o.toss ? ' is-toss' : '') : 'is-intro')
                     + (o.reducedMotion ? ' is-reduced' : '');
      root.innerHTML = '<div class="hsg-stage">' + stageSvg() + '</div>'
        // no "The Storyteller" label here: the engine's narrator card right below names him
        + (battle ? '' : '<div class="hsg-scene-card"><span class="hsg-scene-line" aria-hidden="true"></span></div>');
      el.innerHTML = '';
      el.appendChild(root);
      line = root.querySelector('.hsg-scene-line');
      lastBeat = null;
      if (!o.reducedMotion) frameWatch();
    },
    // The engine sends beat(i, line) per narrator line and beat(-1, '') once when the
    // beats end; it is state (re-sent after a re-mount), so a repeat is harmless.
    // The narrator line itself goes sr-only on the engine's card; this card shows it.
    beat(i, text) {
      if (!root || root.classList.contains('is-battle')) return;
      const arm = root.querySelector('.hsg-st-arm');
      if (i >= 0) {
        root.classList.remove('is-snapped');
        if (line) { line.textContent = text || ''; retrigger(line, 'is-new'); }
        if (lastBeat !== i) retrigger(arm, 'is-lift');
      } else {
        // The lines are over: the fan snaps shut and the line card folds away (CSS), so
        // the brief, the roll call and Ready sit higher on a short phone.
        root.classList.add('is-snapped');
        if (line) line.textContent = '';
        if (lastBeat !== -1) retrigger(arm, 'is-flick');
      }
      lastBeat = i;
    },
    stop() {
      if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      raf = 0;
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = null; line = null; lastBeat = null;
    },
  };
  return inst;
}
hsgSceneMake.n = 0;

const HsgScene = hsgSceneMake();
HsgScene.make = hsgSceneMake;
