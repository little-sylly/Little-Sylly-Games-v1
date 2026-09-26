/* ═══════════════════════════════════════════════════════════════════════════
   designs.js — SANDBOX. Three widescreen layouts for the Workshop.

   Each design is markup only. Two kinds of hole in it:
     data-slot="…"  a REAL element from src/screens/_shell.html is moved in here
                    (the stage, Save, Reset, the sliders, Undo/Remove/Done, the
                    header icons) — its js/controller.js listeners come with it.
     data-dyn="…"   workshop-lab.js paints this from live state (ctlDraft,
                    ctlStickerState, ctlStickerManifest) on every ctlRenderPanel.
   `parts` / `palette` / `sheet` name the look the painter gives each region.
   ═══════════════════════════════════════════════════════════════════════════ */

const WL_HEAD = `
  <header class="wl-head">
    <div class="wl-title-block">
      <h1 class="wl-title">The Workshop</h1>
      <p class="wl-sub">Make the controller yours.</p>
    </div>
    <div class="wl-head-tools">
      <i data-slot="how"></i><i data-slot="sound"></i><i data-slot="exit"></i>
    </div>
  </header>`;

/* The sticker inspector — identical in all three, only where it sits differs. */
const WL_INSP = `
  <div class="wl-insp" data-insp>
    <div class="wl-insp-top">
      <img class="wl-insp-img" data-dyn="inspimg" alt="">
      <div class="wl-insp-text">
        <p class="wl-insp-kick" data-dyn="inspkick"></p>
        <p class="wl-insp-title" data-dyn="insptitle">Sticker</p>
        <p class="wl-insp-say" data-dyn="say"></p>
      </div>
    </div>
    <div class="wl-insp-sliders" data-insp-sliders>
      <label class="wl-slider"><span>Size</span><i data-slot="size"></i></label>
      <label class="wl-slider"><span>Turn</span><i data-slot="rot"></i></label>
    </div>
    <div class="wl-insp-btns"><i data-slot="undo"></i><i data-slot="del"></i><i data-slot="done"></i></div>
  </div>`;

/* Randomise All. A glass key like Reset — not a rainbow bar, which out-shouted
   Save on every design. Chance is said by the die; WHAT it will change is said
   by the four dots — the shell, face, ears and buttons as they are now — which
   pop into their new colours on the roll. workshop-lab.js paints the dots. */
const WL_DICE = sm => `
  <button class="wl-dice${sm ? ' wl-dice-sm' : ''}" data-act="random" aria-label="Randomise All">
    <svg class="wl-dice-die" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="8.2" cy="8.2" r="1.7"/><circle cx="15.8" cy="8.2" r="1.7"/><circle cx="12" cy="12" r="1.7"/>
      <circle cx="8.2" cy="15.8" r="1.7"/><circle cx="15.8" cy="15.8" r="1.7"/>
    </svg>
    <span class="wl-dice-lbl">Randomise All</span>
    <span class="wl-dice-dots" data-dyn="dicedots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  </button>`;

const WL_DESIGNS = {

  /* ── A · Bench ─────────────────────────────────────────────────────────────
     The jukebox's twin: the object on a lit stage on the left, a glass panel
     on the right with the two jobs as a segmented control. The deck under the
     stage is the design at a glance — four parts, their colours — and the
     way out (Save). Closest to what already ships; least to learn. */
  bench: {
    tabs: true,
    parts: 'tags', palette: 'caption', sheet: 'grid5',
    html: `${WL_HEAD}
    <main class="wlA-body">
      <div class="wlA-left">
        <div class="wl-view wlA-view">
          <div class="wl-spot"></div><div class="wl-plinth"></div>
          <i data-slot="stage"></i>
          <p class="wl-hint">Drag to turn it · scroll to zoom</p>
        </div>
        <div class="wl-glass wlA-deck">
          <div class="wlA-deck-parts" data-dyn="parts"></div>
          <div class="wlA-deck-btns"><i data-slot="reset"></i><i data-slot="save"></i></div>
        </div>
      </div>
      <div class="wl-glass wlA-panel">
        <div class="wl-seg" role="tablist">
          <button class="wl-seg-btn" data-tab="colours" role="tab"><span class="wl-seg-ico">🎨</span>Paint</button>
          <button class="wl-seg-btn" data-tab="stickers" role="tab"><span class="wl-seg-ico">⭐</span>Stickers<span class="wl-count" data-dyn="count"></span></button>
        </div>
        <div class="wl-pane wlA-pane" data-pane="colours">
          <div class="wlA-pane-head">
            <p class="wl-kicker">Painting</p>
            <h2 class="wl-h2" data-dyn="partname"></h2>
            <p class="wl-dim" data-dyn="parthint"></p>
          </div>
          <div data-dyn="palette"></div>
          ${WL_DICE()}
        </div>
        <div class="wl-pane wlA-pane wlA-pane-st" data-pane="stickers">
          <div class="wlA-sheet-scroll"><div data-dyn="sheet"></div></div>
          ${WL_INSP}
        </div>
      </div>
    </main>`,
  },

  /* ── B · Paint Shop ────────────────────────────────────────────────────────
     Widescreen has room for both jobs at once, so there are no tabs at all:
     paint on the left, the controller in the middle, the sticker sheet on the
     right. The sticker inspector docks at the foot of the sheet while a
     sticker is in hand (floating it over the stage hid the very spot being
     stuck on), and Save sits under the model like a till. */
  shop: {
    tabs: false,
    parts: 'rows', palette: 'compact', sheet: 'grid3',
    html: `${WL_HEAD}
    <main class="wlB-body">
      <aside class="wl-glass wlB-col">
        <p class="wl-kicker wlB-col-head">🎨 Paint</p>
        <div class="wlB-parts" data-dyn="parts"></div>
        <div class="wlB-palette-wrap">
          <p class="wl-dim wlB-picked" data-dyn="picked"></p>
          <div data-dyn="palette"></div>
        </div>
        ${WL_DICE()}
      </aside>
      <div class="wl-view wlB-view">
        <div class="wl-spot"></div><div class="wl-plinth"></div>
        <i data-slot="stage"></i>
        <p class="wl-hint wlB-hint">Drag to turn it · scroll to zoom</p>
        <div class="wlB-float">
          <div class="wl-glass wlB-till"><i data-slot="reset"></i><i data-slot="save"></i></div>
        </div>
      </div>
      <aside class="wl-glass wlB-col">
        <p class="wl-kicker wlB-col-head">⭐ Stickers <span class="wl-count" data-dyn="count"></span></p>
        <p class="wl-dim wlB-say-idle" data-dyn="sayidle"></p>
        <div class="wlB-sheet-scroll"><div data-dyn="sheet"></div></div>
        ${WL_INSP}
      </aside>
    </main>`,
  },

  /* ── C · Craft Mat ─────────────────────────────────────────────────────────
     The controller gets the whole width, lying on a cutting mat, and every
     tool lives in one drawer along the bottom — folder tabs for Paint and
     Stickers, the paint as tins and dabs, the stickers as a sheet you peel
     from. The drawer's right end is always Save, whichever tab is open. */
  mat: {
    tabs: true,
    parts: 'tins', palette: 'dabs', sheet: 'strip',
    html: `
    <main class="wlC-body">
      <div class="wlC-mat">
        <div class="wlC-grid"></div>
        <div class="wlC-ruler wlC-ruler-top"></div><div class="wlC-ruler wlC-ruler-left"></div>
        ${WL_HEAD}
        <div class="wl-view wlC-view">
          <div class="wl-spot"></div>
          <i data-slot="stage"></i>
        </div>
        <p class="wl-hint wlC-hint">Drag to turn it · scroll to zoom</p>
      </div>
      <div class="wlC-drawer">
        <div class="wlC-tabs" role="tablist">
          <button class="wlC-tab" data-tab="colours" role="tab">🎨 Paint</button>
          <button class="wlC-tab" data-tab="stickers" role="tab">⭐ Stickers <span class="wl-count" data-dyn="count"></span></button>
        </div>
        <div class="wlC-tray">
          <div class="wl-pane wlC-pane" data-pane="colours">
            <div class="wlC-tins" data-dyn="parts"></div>
            <div class="wlC-divider"></div>
            <div class="wlC-dabs-wrap">
              <div class="wlC-dabs-head">
                <p class="wl-dim" data-dyn="picked"></p>
                ${WL_DICE(true)}
              </div>
              <div data-dyn="palette"></div>
            </div>
          </div>
          <div class="wl-pane wlC-pane" data-pane="stickers">
            <div class="wlC-backing"><div data-dyn="sheet"></div></div>
            ${WL_INSP}
          </div>
          <div class="wlC-end"><i data-slot="save"></i><i data-slot="reset"></i></div>
        </div>
      </div>
    </main>`,
  },
};
