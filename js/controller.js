// ═══════════════════════════════════════════════════════════════════════════
// controller.js — the 3D controller: the lobby ornament, the Workshop, and the
// Konami input surface. Prefix: ctl
//
// Depends on: js/lib/three.min.js (THREE), js/lib/controller-body.js
//             (ControllerBody), js/engine.js (GAME_BRAND_HEX,
//             LOBBY_COLOUR_ORDER, showScreen, isMuted, masterVolume,
//             sfxEnabled, getAudioCtx), js/secret-mode.js (smHandleButton —
//             forward reference, called only from a user gesture)
//
// Loaded immediately BEFORE secret-mode.js: it replaces DOM that secret-mode
// binds to at parse time.
//
// The file has two halves, split by the "══ RENDERER ══" marker below. The half
// above it is pure — no DOM, no THREE, no canvas — which is what lets
// tools/verify-controller-state.js evaluate it under Node.
// ═══════════════════════════════════════════════════════════════════════════

// ── Colour state ─────────────────────────────────────────────────────────────
/* The prototype's stand-in palette, kept deliberately: this is the FACTORY
   look, and it is not one of the twenty brand colours. Reset returns here, so
   the factory controller stays reachable and stays distinguishable from any
   design a player could have built out of the palette. */
const CTL_DEFAULTS = { shell: '#a97fd6', plate: '#9670c8', ears: '#a97fd6', buttons: '#8f66c4' };
const CTL_GROUPS = ['shell', 'plate', 'ears', 'buttons'];

const CTL_STORAGE_KEY   = 'sylly_controller';
const CTL_STATE_VERSION = 1;

let ctlDesign = Object.assign({}, CTL_DEFAULTS);

function ctlIsHex(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v); }

/* Total by construction. This runs on the app's front door, so every failure
   path — absent, malformed, wrong-typed, wrong-version, a localStorage that
   throws outright in private mode — resolves to the factory design rather than
   throwing. A field is validated for hex SHAPE, not for palette membership:
   the factory colours are themselves outside the twenty, and a 21st game's
   colour must be readable before this file has ever heard of it. */
function ctlReadDesign() {
  const out = Object.assign({}, CTL_DEFAULTS);
  try {
    const raw = localStorage.getItem(CTL_STORAGE_KEY);
    if (!raw) return out;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    if (o.v !== CTL_STATE_VERSION) return out;
    for (const k of CTL_GROUPS) if (ctlIsHex(o[k])) out[k] = o[k];
  } catch (_) { /* fall through to the factory design */ }
  return out;
}

function ctlWriteDesign(design) {
  try {
    localStorage.setItem(CTL_STORAGE_KEY, JSON.stringify({
      v: CTL_STATE_VERSION,
      shell:   design.shell,
      plate:   design.plate,
      ears:    design.ears,
      buttons: design.buttons,
    }));
  } catch (_) { /* storage unavailable — the session still works, it just won't persist */ }
}

// ── Palette ──────────────────────────────────────────────────────────────────
/* READ from GAME_BRAND_HEX, never copied. A 21st game appears in the Workshop
   with zero edits here, and a brand recolour propagates for free.
   Object.values() order carries no meaning, so the swatches follow
   LOBBY_COLOUR_ORDER — the same hue walk the lobby's Colour sort uses, so both
   surfaces agree about what "next to" means. */
function ctlPalette() {
  const src   = (typeof GAME_BRAND_HEX === 'object' && GAME_BRAND_HEX) ? GAME_BRAND_HEX : {};
  const ids   = Object.keys(src);
  const order = (typeof LOBBY_COLOUR_ORDER !== 'undefined' && Array.isArray(LOBBY_COLOUR_ORDER))
    ? LOBBY_COLOUR_ORDER.filter(id => src[id]).concat(ids.filter(id => LOBBY_COLOUR_ORDER.indexOf(id) < 0))
    : ids;
  return order.map(id => ({ id: id, hex: src[id] }));
}

// ══ RENDERER ══ everything below needs THREE, a document and a canvas ═══════
