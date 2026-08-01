// ═══════════════════════════════════════════════════════════════════════════
// art.js — the asset resolution seam. ONE function decides what image (if any)
// a render seam draws, across three tiers:
//
//   1. active skin pack   data/packs/<id>/   optional, runtime-cached, Secret Mode
//   2. core art pack      data/art/<kind>/   the game's own default art, precached
//   3. null               → the seam draws its built-in emoji/CSS face
//
// Both tiers use the SAME manifest shape (an `assets` block: kind / basePath /
// faces / back / extras), so one art pipeline and one authoring doc serve both.
// They differ only in caching contract and visibility:
//   • skin packs  — listed in data/packs/registry.json, offered in the Terminal,
//                   runtime-cached (add/remove a folder, no SW version bump)
//   • core art    — listed in data/art/registry.json, NEVER in the Terminal,
//                   precached in sw.js (default art is part of the app version)
//
// Game logic and multiplayer packets carry ids only — never image paths — so two
// devices can run different skins in the same match with zero sync impact.
//
// Depends on: nothing. Loaded before every game plugin.
// Read by: pkoRenderCard, frtRenderCard, shpRenderCard, flwRenderCard,
//          Cards.buildEl/buildBackEl, dybDieHTML/dybDieBackHTML.
//          dybDieHTML additionally reads assetSpecial/assetSpecialFrame — the
//          `specials` block, for faces that carry a type as well as a value.
// Written by: secret-mode.js (sets window.activeAssetPack when a skin launches).
// ═══════════════════════════════════════════════════════════════════════════

window.activeAssetPack = window.activeAssetPack || null; // skin pack, or null (declared here so
                                                         // resolution never depends on Secret Mode
                                                         // having been initialised)
window.coreArt = {};        // kind -> { id, assets } — the default art packs
let coreArtLoaded = false;

// Loads every core art pack listed in data/art/registry.json. Called once at boot.
// Never throws into the boot path: a failure just leaves window.coreArt empty and
// every seam falls through to its emoji face, exactly as before core art existed.
async function artLoadCore() {
  if (coreArtLoaded) return;
  try {
    const ids = await (await fetch('data/art/registry.json')).json();
    const manifests = await Promise.all(
      ids.map(id => fetch(`data/art/${id}/pack.json`).then(r => {
        if (!r.ok) throw new Error(`core art ${id}: HTTP ${r.status}`);
        return r.json();
      }))
    );
    manifests.forEach(m => {
      if (m && m.assets && m.assets.kind) window.coreArt[m.assets.kind] = { id: m.id, assets: m.assets };
    });
  } catch (err) {
    console.warn('[art] core art unavailable — falling back to emoji faces.', err);
  }
  coreArtLoaded = true;
}

// Resolves once at boot; games may await it before their first render.
const artReady = artLoadCore();

// Builds a URL from a manifest entry, or null if that pack doesn't cover the key.
function artResolve(baseDir, assets, file) {
  return file ? `${baseDir}${assets.basePath || ''}${file}` : null;
}

// The active skin pack's assets block for this kind, or null.
function artSkin(kind) {
  const p = window.activeAssetPack;
  return (p && p.assets && p.assets.kind === kind) ? p : null;
}

// The card/tile/die face image for (kind, id): skin first, then core art, else null.
// `id` is the game's own stable, packet-safe id — never an index into a private array.
function assetFace(kind, id) {
  const skin = artSkin(kind);
  if (skin) {
    const url = artResolve(`data/packs/${skin.id}/`, skin.assets, skin.assets.faces && skin.assets.faces[id]);
    if (url) return url;   // a skin that covers this id wins
  }
  const core = window.coreArt[kind];
  if (core) return artResolve(`data/art/${core.id}/`, core.assets, core.assets.faces && core.assets.faces[id]);
  return null;             // → the seam draws its default face
}

// The face-down image for this kind, or null (→ the seam draws its default back).
function assetBack(kind) {
  const skin = artSkin(kind);
  if (skin) {
    const url = artResolve(`data/packs/${skin.id}/`, skin.assets, skin.assets.back);
    if (url) return url;
  }
  const core = window.coreArt[kind];
  if (core) return artResolve(`data/art/${core.id}/`, core.assets, core.assets.back);
  return null;
}

// Non-card game art (reference diagrams, board furniture) from the `extras` block.
// Same three-tier resolution — a skin may override an extra, but rarely does.
function assetExtra(kind, key) {
  const skin = artSkin(kind);
  if (skin) {
    const url = artResolve(`data/packs/${skin.id}/`, skin.assets, skin.assets.extras && skin.assets.extras[key]);
    if (url) return url;
  }
  const core = window.coreArt[kind];
  if (core) return artResolve(`data/art/${core.id}/`, core.assets, core.assets.extras && core.assets.extras[key]);
  return null;
}

// The image for a MODIFIED face — a face that carries a type on top of its value.
// First user: DYB's Tempest dice (loaded / phantom / slick / cracked / snake).
// `id` is a face value, or the reserved string 'blank' for a variant that shows no
// face at all (a concealed phantom, a cracked die).
// Same skin → core → null chain as assetFace, resolved per key, so a partial
// specials block falls through rather than falling off.
function assetSpecial(kind, type, id) {
  const skin = artSkin(kind);
  if (skin) {
    const t = skin.assets.specials && skin.assets.specials[type];
    const url = t && artResolve(`data/packs/${skin.id}/`, skin.assets, t[id]);
    if (url) return url;
  }
  const core = window.coreArt[kind];
  if (core) {
    const t = core.assets.specials && core.assets.specials[type];
    if (t) return artResolve(`data/art/${core.id}/`, core.assets, t[id]);
  }
  return null;
}

// Whether the engine draws its own type chrome (border + tint + glow) around that
// art. False only where a tier explicitly opts out with "frame": false — a pack
// author taking responsibility for keeping the type legible themselves.
function assetSpecialFrame(kind, type) {
  const skin = artSkin(kind);
  if (skin) {
    const t = skin.assets.specials && skin.assets.specials[type];
    if (t && typeof t.frame === 'boolean') return t.frame;
  }
  const core = window.coreArt[kind];
  if (core) {
    const t = core.assets.specials && core.assets.specials[type];
    if (t && typeof t.frame === 'boolean') return t.frame;
  }
  return true;
}
