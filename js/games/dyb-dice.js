// ═══════════════════════════════════════════════════════════════════════════
// dyb-dice.js — The Bluff's procedural dice.
//
//   set + tint + face + type + state  →  RECIPE (pure data)  →  MARKUP (a string)
//
// Two independent axes: the dice SET is the look (Rocky by default; a Secret
// Mode skin pack may supply another as a `diceSet` block), the TINT is the
// player's identity colour (their seat). Tempest types are FORMS layered on any
// set and tint — the body always belongs to its owner.
//
// Everything above the cube section is pure: no DOM, no window, no game state.
// That is what lets tools/verify-dyb-dice.js test it under Node, and what lets
// this file move to js/lib/ unchanged once a second dice game or the dice
// selector exists. It must NEVER read dyb* game state — callers pass it in.
//
// Depends on: nothing at load. Reads assetDiceSet (js/lib/art.js) at call time.
// Read by: js/games/dyb.js.
// ═══════════════════════════════════════════════════════════════════════════

// Pip-position grid (1-indexed): 1 2 3 / 4 5 6 / 7 8 9
const DYB_PIP_LAYOUTS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

// ── Sets ────────────────────────────────────────────────────────────────────
// A set: { id, label, finish, pip, edge 0..1, speckle 0..1, tints[8] { name, body, pip? }, cup { body, rim } }
// Tints run light → dark, so the eight still separate in greyscale.
const DYB_DICE_SETS = {
  rocky: {
    id: 'rocky', label: 'Rocky', finish: 'stone', pip: 'carved', edge: 0.6, speckle: 0.5,
    tints: [
      { name: 'chalk',      body: '#E6DDCB' }, { name: 'sandstone', body: '#D4B483' },
      { name: 'ochre',      body: '#C08A3E' }, { name: 'terracotta', body: '#B0603F' },
      { name: 'moss',       body: '#7A8756' }, { name: 'slate',     body: '#5D6B75' },
      { name: 'umber',      body: '#6E4B34' }, { name: 'basalt',    body: '#3A3836' },
    ],
    cup: { body: '#5A3E2B', rim: '#3B281B' },
  },
  classic: {
    id: 'classic', label: 'Classic', finish: 'plain', pip: 'printed', edge: 0, speckle: 0,
    tints: [
      { name: 'ivory', body: '#F5F1E8' }, { name: 'sand',  body: '#E4CFA3' },
      { name: 'amber', body: '#D9A441' }, { name: 'coral', body: '#C8664A' },
      { name: 'sage',  body: '#8A9A68' }, { name: 'steel', body: '#667784' },
      { name: 'cocoa', body: '#7A5238' }, { name: 'charcoal', body: '#3E3C3A' },
    ],
    cup: { body: '#4A4744', rim: '#2F2D2B' },
  },
};
const DYB_FINISHES   = ['stone', 'plain', 'glass'];
const DYB_PIP_STYLES = ['carved', 'printed'];
const DYB_HEX = /^#[0-9a-fA-F]{6}$/;

// Returns a list of problems; [] means valid. A skin pack's set is only used
// when this is empty — anything else falls back to Rocky with a console warning.
function dybValidateDiceSet(s) {
  const e = [];
  if (!s || typeof s !== 'object') return ['not an object'];
  if (typeof s.label !== 'string' || !s.label) e.push('label');
  if (!DYB_FINISHES.includes(s.finish)) e.push('finish');
  if (!DYB_PIP_STYLES.includes(s.pip)) e.push('pip');
  ['edge', 'speckle'].forEach(k => { if (typeof s[k] !== 'number' || s[k] < 0 || s[k] > 1) e.push(k); });
  if (!Array.isArray(s.tints) || s.tints.length !== 8) e.push('tints: need exactly 8');
  else s.tints.forEach((t, i) => {
    if (!t || !DYB_HEX.test(t.body)) e.push(`tints[${i}].body`);
    if (t && t.pip !== undefined && !DYB_HEX.test(t.pip)) e.push(`tints[${i}].pip`);
  });
  if (!s.cup || !DYB_HEX.test(s.cup.body) || !DYB_HEX.test(s.cup.rim)) e.push('cup');
  return e;
}

function dybActiveSet() {
  const skin = (typeof assetDiceSet === 'function') ? assetDiceSet('dyb') : null;
  if (skin) {
    const errs = dybValidateDiceSet(skin);
    if (!errs.length) return skin;
    console.warn('[dyb] skin diceSet invalid, using Rocky:', errs.join(', '));
  }
  return DYB_DICE_SETS.rocky;
}

// ── Colour maths ────────────────────────────────────────────────────────────
function dybLum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function dybContrast(a, b) {
  const x = dybLum(a), y = dybLum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const DYB_PIP_DARK = '#2B2118', DYB_PIP_LIGHT = '#F4ECE0';
function dybPipFor(tint) {
  if (tint.pip) return tint.pip;
  return dybContrast(tint.body, DYB_PIP_DARK) >= dybContrast(tint.body, DYB_PIP_LIGHT) ? DYB_PIP_DARK : DYB_PIP_LIGHT;
}
// amt in -1..1: toward black (negative) or white (positive).
function dybShade(hex, amt) {
  const target = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return '#' + [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (target - v) * p).toString(16).padStart(2, '0');
  }).join('');
}
function dybTint(set, tint) { return set.tints[((tint % 8) + 8) % 8]; }
function dybTintHex(set, tint) { return dybTint(set, tint).body; }

// ── Recipe — pure description of one die ────────────────────────────────────
// state: 'face' (visible; a Phantom here is REVEALED) | 'concealed' (a Phantom
// in its owner's or a spectator's view) | 'unpicked' (a Slick before commit).
function dybDieRecipe({ set, tint = 0, face, type = 'standard', secondary = null, state = 'face' }) {
  const s = set || DYB_DICE_SETS.rocky;
  const t = dybTint(s, tint);
  // THE LEAK GUARD: a concealed Phantom's recipe carries no face and no hidden
  // secondary — so no painter, cube or DOM downstream can ever expose them.
  const concealed = type === 'phantom' && state === 'concealed';
  const shown = concealed ? null : face;
  const form = type === 'phantom' ? (concealed ? null : secondary) : (type === 'standard' ? null : type);
  const overlays = [];
  if (type === 'phantom') overlays.push(concealed ? 'mist' : 'mist-lift');
  if (form === 'cracked') overlays.push('fissure');
  if (form === 'slick') overlays.push('sheen');
  if (form === 'slick' && state === 'unpicked') overlays.push('pick-badge');
  return {
    set: s.id || s.label, finish: s.finish, edge: s.edge, speckle: s.speckle,
    body: t.body, bodyDark: dybShade(t.body, -0.22), bodyLight: dybShade(t.body, 0.25),
    pip: dybPipFor(t),
    pipStyle: form === 'loaded' ? 'bronze' : form === 'snake' ? 'serpent' : s.pip,
    faded: form === 'cracked',
    face: shown,
    positions: shown ? DYB_PIP_LAYOUTS[shown] : [],
    overlays, type, form,
    key: [s.id || s.label, tint, shown === null ? 'x' : shown, type, form || '-', concealed ? 'c' : state].join('|'),
  };
}

// ── Markup — a recipe as an HTML string ─────────────────────────────────────
const DYB_OVERLAY_HTML = {
  'mist':       '<span class="dyb-ov dyb-ov-mist"><span class="dyb-ov-wisp"></span></span>',
  'mist-lift':  '<span class="dyb-ov dyb-ov-mist dyb-ov-mist-lift"><span class="dyb-ov-wisp"></span></span>',
  'fissure':    '<svg class="dyb-ov dyb-ov-fissure" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
                '<path class="dyb-fis-bed" d="M-4 10 L16 26 L10 42 L32 48 L28 62 L50 68 L58 84 L74 86 L104 106"/>' +
                '<path class="dyb-fis-bed dyb-fis-branch" d="M32 48 L48 38 L64 42 L80 26 L90 24"/>' +
                '<path class="dyb-fis-lit" d="M-4 12 L16 28 L10 44 L32 50 L28 64 L50 70 L58 86 L74 88 L104 108"/></svg>',
  'sheen':      '<span class="dyb-ov dyb-ov-sheen"><span class="dyb-ov-drop"></span><span class="dyb-ov-drop dyb-ov-drop-2"></span></span>',
  'pick-badge': '<span class="dyb-ov dyb-ov-pick">pick</span>',
};
// attrs is inserted verbatim into the opening tag (leading space included).
function dybDieMarkup(r, px, attrs = '', extraClass = '') {
  let cells = '';
  for (let i = 1; i <= 9; i++) {
    cells += r.positions.includes(i) ? `<span class="dyb-pip dyb-pip-${r.pipStyle}"></span>` : '<span></span>';
  }
  const overlays = r.overlays.map(o => DYB_OVERLAY_HTML[o] || '').join('');
  const glyph = r.face === null ? '<span class="dyb-die-glyph">?</span>' : '';
  const cls = ['dyb-die', `dyb-finish-${r.finish}`, r.faded ? 'dyb-die-faded' : '', r.form ? `dyb-form-${r.form}` : '', extraClass]
    .filter(Boolean).join(' ');
  const style = `--dyb-s:${px}px;--dyb-body:${r.body};--dyb-body-d:${r.bodyDark};--dyb-body-l:${r.bodyLight};` +
                `--dyb-pip:${r.pip};--dyb-edge:${r.edge};--dyb-speckle:${r.speckle}`;
  return `<div class="${cls}" style="${style}"${attrs}>${cells}${overlays}${glyph}</div>`;
}

// A life marker on a climber chip: a tiny tinted die (or a ◆ under Footholds).
function dybMiniMarkup(set, tint, cls = '') {
  return `<span class="dyb-mini ${cls}" style="--dyb-body:${dybTintHex(set, tint)}"></span>`;
}
function dybCupMarkup(set, extraStyle = '') {
  return `<div class="dyb-cup" style="--dyb-cup:${set.cup.body};--dyb-cup-rim:${set.cup.rim};${extraStyle}">` +
         '<span class="dyb-cup-band"></span><span class="dyb-cup-foot"></span><span class="dyb-cup-rim"></span></div>';
}

// ═══ DOM helpers — the ONLY impure part of this file ════════════════════════
// A scripted animation is invisible to the global reduced-motion CSS block,
// so anything this file (or dyb.js) animates by hand asks here first.
function dybReducedMotion() {
  return !!(typeof window !== 'undefined' && window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// ── The cube — six painted faces on a CSS preserve-3d box ───────────────────
// Face placement: 1 front, 6 back, 2 right, 5 left, 3 top, 4 bottom. To bring
// face k to the front the INNER box turns by DYB_CUBE_LAND[k]. Every entry names
// both rotateX and rotateY so a transition from a spun state interpolates per
// function (a mismatched list would fall back to matrix interpolation: no spin).
const DYB_CUBE_LAND = {
  1: 'rotateX(0deg) rotateY(0deg)',   2: 'rotateX(0deg) rotateY(-90deg)',
  3: 'rotateX(-90deg) rotateY(0deg)', 4: 'rotateX(90deg) rotateY(0deg)',
  5: 'rotateX(0deg) rotateY(90deg)',  6: 'rotateX(0deg) rotateY(180deg)',
};
// recipeForFace(face) → recipe. A concealed Phantom passes one recipe for all six
// and landFace 1, so neither the faces nor data-land can leak its value.
function dybCubeMarkup(recipeForFace, landFace, px) {
  let faces = '';
  for (let f = 1; f <= 6; f++) faces += `<div class="dyb-cube-face dyb-cube-f${f}">${dybDieMarkup(recipeForFace(f), px)}</div>`;
  return `<div class="dyb-cube" style="--dyb-s:${px}px"><div class="dyb-cube-inner" data-land="${landFace}">${faces}</div></div>`;
}
function dybRollCube(cubeEl, ms, seed) {
  const inner = cubeEl.querySelector('.dyb-cube-inner');
  if (!inner) return;
  const land = DYB_CUBE_LAND[inner.dataset.land] || DYB_CUBE_LAND[1];
  const sx = 360 * (2 + (seed % 2)), sy = 360 * (1 + ((seed >> 1) % 2));
  inner.style.transition = 'none';
  inner.style.transform = `rotateX(${sx}deg) rotateY(${sy}deg) ${land}`;
  void inner.offsetWidth;                                   // commit the spun start state
  inner.style.transition = `transform ${ms}ms cubic-bezier(0.2, 0.7, 0.25, 1)`;
  inner.style.transform = `rotateX(0deg) rotateY(0deg) ${land}`;
}
function dybLandCube(cubeEl) {
  const inner = cubeEl.querySelector('.dyb-cube-inner');
  if (!inner) return;
  inner.style.transition = 'none';
  inner.style.transform = `rotateX(0deg) rotateY(0deg) ${DYB_CUBE_LAND[inner.dataset.land] || DYB_CUBE_LAND[1]}`;
}
