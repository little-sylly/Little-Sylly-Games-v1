/* ═══════════════════════════════════════════════════════════════════════════
   workshop-lab.js — SANDBOX. Boots the REAL Workshop and re-houses it.

   Nothing here re-implements the controller. The shipped partial
   (src/screens/_shell.html) and the shipped scripts (engine.js, controller.js)
   load exactly as the app loads them; this file then
     1. MOVES the live elements (the stage, Save/Reset, the sliders, Undo/Remove/
        Done, the header icons) into whichever design is showing — a moved node
        keeps its listeners, so every button still does the shipped thing;
     2. replaces ctlRenderPanel (and ctlStickerSay) with a painter that draws the
        design's panels from the same live state the shipped panel reads:
        ctlDraft, ctlActiveGroup, ctlActiveTab, ctlStickerState,
        ctlStickerManifest. Every click calls the shipped function
        (ctlSelectColour, ctlRandomiseAll, ctlStickerDispatch,
        ctlOpenStickersTab) — so what the review sees is the real behaviour
        in a new frame, not a mock of it;
     3. replaces ctlCloseWorkshop with a toast: there is no room to go back to.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  const $ = id => document.getElementById(id);
  const room = $('wl-room');
  let cur = null;          // design key
  let lastSay = '';
  let savedFlag = false;
  const REFS = {};

  const SLOT_CLS = {
    stage: 'ctl-workshop-stage wl-stage',
    how: 'wl-icon', sound: 'btn-open-sound wl-icon', exit: 'wl-icon',
    save: 'wl-btn wl-btn-save', reset: 'wl-btn wl-btn-ghost',
    size: 'wl-range', rot: 'wl-range',
    undo: 'wl-mini', del: 'wl-mini wl-mini-danger', done: 'wl-mini wl-mini-go',
  };
  const SLOT_TXT = { how: '?', exit: '✕', undo: 'Undo', del: 'Remove', done: 'Done' };

  // ── Boot: the shipped partials and scripts, in the shipped order ──────────
  function load(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('lab: failed to load ' + src));
      document.body.appendChild(s);
    });
  }

  async function boot() {
    const [shell, sound] = await Promise.all([
      fetch('src/screens/_shell.html').then(r => r.text()),
      fetch('src/screens/_sound.html').then(r => r.text()),
    ]);
    // #btn-mute lives in a GAME partial and engine.js wires it unguarded at boot
    // (the lobby-lab shell found the same asymmetry).
    $('wl-live').innerHTML = shell + sound + '<button id="btn-mute" hidden aria-hidden="true">🔊</button>';

    await load('js/lib/music.js');
    await load('js/engine.js');
    await load('js/lib/controller-sticker-surface.js');
    await load('js/controller.js');
    // secret-mode.js is not loaded: a Konami press would call into nothing.
    if (typeof window.smHandleButton !== 'function') window.smHandleButton = () => {};

    const ws = $('screen-workshop');
    Object.assign(REFS, {
      stage: $('ctl-stage'), how: $('btn-ctl-how-to'), sound: ws.querySelector('.btn-open-sound'),
      exit: $('btn-ctl-exit'), save: $('btn-ctl-save'), reset: $('btn-ctl-reset'),
      size: $('ctl-sticker-size'), rot: $('ctl-sticker-rot'),
      undo: $('btn-ctl-sticker-undo'), del: $('btn-ctl-sticker-delete'), done: $('btn-ctl-sticker-done'),
    });
    // The two overlays a design can open must not sit inside the hidden container.
    ['ctl-how-to-overlay', 'sound-overlay'].forEach(id => { const el = $(id); if (el) document.body.appendChild(el); });
    // Ids the painter now owns — the shipped copies would be duplicates.
    ['ctl-sticker-book', 'ctl-sticker-say'].forEach(id => { const el = $(id); if (el) el.remove(); });

    // ── The overrides ──
    window.ctlRenderPanel = render;
    window.ctlStickerSay = msg => { lastSay = msg || ''; paintSay(); };
    window.ctlCloseWorkshop = () => {
      toast(savedFlag ? 'Saved. In the app, the Workshop now closes back to the room you opened it from.'
                      : 'In the app, ✕ closes without saving and goes back to the room you came from.');
      savedFlag = false;
    };
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#btn-ctl-save')) savedFlag = true; }, true);

    setDesign(designFromHash(), true);
    window.ctlOpenWorkshop({ onReturn: () => {} });
    if (!WL_DESIGNS[cur].tabs) window.ctlOpenStickersTab();
    window.wlReady = true;
  }

  // ── Designs ────────────────────────────────────────────────────────────────
  function designFromHash() {
    const h = location.hash.replace('#', '');
    return WL_DESIGNS[h] ? h : 'bench';
  }

  function setDesign(key, first) {
    if (key === cur) return;
    const park = $('wl-park');
    Object.values(REFS).forEach(el => { if (el) park.appendChild(el); });
    cur = key;
    const d = WL_DESIGNS[key];
    room.innerHTML = d.html;
    room.querySelectorAll('[data-slot]').forEach(ph => {
      const k = ph.getAttribute('data-slot'), el = REFS[k];
      if (!el) { ph.remove(); return; }
      el.className = SLOT_CLS[k] || '';
      if (SLOT_TXT[k]) el.textContent = SLOT_TXT[k];
      ph.replaceWith(el);
    });
    $('wl').dataset.design = key;
    document.querySelectorAll('.wl-lab [data-design]').forEach(b =>
      b.setAttribute('aria-selected', String(b.dataset.design === key)));
    if (location.hash.replace('#', '') !== key) history.replaceState(null, '', '#' + key);
    if (first) return;
    // The canvas moved with #ctl-stage; its new box is known next frame.
    requestAnimationFrame(() => { if (typeof ctlResize === 'function') ctlResize(); });
    if (!d.tabs) window.ctlOpenStickersTab();
    else render();
  }

  // ── Painting ───────────────────────────────────────────────────────────────
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function colourName(group, hex) {
    const up = String(hex).toUpperCase();
    const hit = ctlPalette().find(p => p.hex.toUpperCase() === up);
    if (hit) {
      const lbl = document.querySelector('#' + hit.id + ' .lobby-btn-label');
      if (lbl) return lbl.textContent.trim();
    }
    if (CTL_DEFAULTS[group] && CTL_DEFAULTS[group].toUpperCase() === up) return 'Factory lilac';
    return up;
  }

  function render() {
    if (!ctlDraft || !cur) return;
    const d = WL_DESIGNS[cur];

    // Tabs + panes
    room.querySelectorAll('[data-tab]').forEach(b => {
      const on = b.dataset.tab === ctlActiveTab;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on));
    });
    room.querySelectorAll('[data-pane]').forEach(p => {
      p.hidden = d.tabs ? p.dataset.pane !== ctlActiveTab : false;
    });

    paintParts(d);
    paintPalette(d);
    const meta = CTL_GROUP_LABELS[ctlActiveGroup];
    room.querySelectorAll('[data-dyn="partname"]').forEach(e => { e.textContent = meta.name; });
    room.querySelectorAll('[data-dyn="parthint"]').forEach(e => { e.textContent = meta.hint; });
    room.querySelectorAll('[data-dyn="picked"]').forEach(e => {
      e.innerHTML = '<b>' + esc(meta.name) + '</b> · ' + esc(colourName(ctlActiveGroup, ctlDraft[ctlActiveGroup]));
    });
    const n = ctlStickerState.stickers.length;
    room.querySelectorAll('[data-dyn="count"]').forEach(e => { e.textContent = n ? String(n) : ''; e.hidden = !n; });
    paintSheet(d);
    paintInspector(d);
    paintSay();
    // Randomise All's preview: the four parts as they are now.
    room.querySelectorAll('[data-dyn="dicedots"] i').forEach((dot, i) => {
      dot.style.setProperty('--c', ctlDraft[CTL_GROUPS[i]]);
    });
  }

  function paintParts(d) {
    const box = room.querySelector('[data-dyn="parts"]');
    if (!box) return;
    box.innerHTML = '';
    for (const g of CTL_GROUPS) {
      const hex = ctlDraft[g], L = CTL_GROUP_LABELS[g], nm = colourName(g, hex);
      const on = g === ctlActiveGroup && (!d.tabs || ctlActiveTab === 'colours');
      const b = document.createElement('button');
      b.setAttribute('aria-pressed', String(on));
      if (d.parts === 'tags') {
        b.className = 'wl-part' + (on ? ' on' : '');
        b.innerHTML = `<span class="wl-chip" style="background:${hex}"></span>
          <span class="wl-part-txt"><b>${esc(L.name)}</b><small>${esc(nm)}</small></span>`;
      } else if (d.parts === 'rows') {
        b.className = 'wl-prow' + (on ? ' on' : '');
        b.innerHTML = `<span class="wl-chip wl-chip-lg" style="background:${hex}"></span>
          <span class="wl-prow-txt"><b>${esc(L.name)}</b><small>${esc(L.hint)}</small></span>
          <span class="wl-prow-name">${esc(nm)}</span>`;
      } else {
        b.className = 'wl-tin' + (on ? ' on' : '');
        b.innerHTML = `<span class="wl-tin-can" style="--c:${hex}"><span class="wl-tin-paint"></span></span>
          <b>${esc(L.name)}</b><small>${esc(nm)}</small>`;
      }
      b.addEventListener('click', () => {
        if (d.tabs && ctlActiveTab !== 'colours') { ctlActiveGroup = g; switchTab('colours'); return; }
        if (g === ctlActiveGroup) return;
        playPillClick();
        ctlActiveGroup = g;
        render();
      });
      box.appendChild(b);
    }
  }

  function paintPalette(d) {
    const box = room.querySelector('[data-dyn="palette"]');
    if (!box) return;
    box.className = 'wl-pal wl-pal-' + d.palette;
    box.innerHTML = '';
    const now = String(ctlDraft[ctlActiveGroup]).toUpperCase();
    for (const sw of ctlPalette()) {
      const nm = colourName(ctlActiveGroup, sw.hex);
      const on = sw.hex.toUpperCase() === now;
      const b = document.createElement('button');
      b.className = 'wl-sw' + (on ? ' on' : '');
      b.style.setProperty('--c', sw.hex);
      b.title = nm;
      b.setAttribute('aria-label', CTL_GROUP_LABELS[ctlActiveGroup].name + ' — ' + nm);
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = '<span class="wl-sw-dot"></span>' + (d.palette === 'caption' ? '<span class="wl-sw-cap">' + esc(nm) + '</span>' : '');
      b.addEventListener('click', () => ctlSelectColour(ctlActiveGroup, sw.hex));
      box.appendChild(b);
    }
  }

  function paintSheet(d) {
    const box = room.querySelector('[data-dyn="sheet"]');
    if (!box) return;
    box.id = 'ctl-sticker-book';          // ctlStickerGoToBook rings a tile in here
    box.className = 'wl-sheet wl-sheet-' + d.sheet;
    box.innerHTML = '';
    if (!ctlStickerManifest || !ctlStickerManifest.length) {
      const p = document.createElement('p');
      p.className = 'wl-sheet-msg';
      p.textContent = !ctlStickerManifest ? 'Getting the stickers out…' : 'No stickers yet — they turn up as they are drawn.';
      box.appendChild(p);
      return;
    }
    const placed = {};
    ctlStickerState.stickers.forEach((s, i) => { placed[s.id] = i; });
    for (const e of ctlStickerManifest) {
      const i = placed[e.id], isPlaced = i !== undefined;
      const on = ctlStickerState.armed === e.id || (isPlaced && ctlStickerState.selected === i);
      const b = document.createElement('button');
      b.className = 'wl-st ctl-sticker-ref-row' + (on ? ' on' : '') + (isPlaced ? ' placed' : '');
      b.setAttribute('data-ctl-sticker-id', e.id);
      b.setAttribute('aria-label', e.label + (isPlaced ? ' — on the controller' : ''));
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = `<span class="wl-st-face"><img src="${CTL_STICKER_DIR + e.image}" alt=""></span>
        <span class="wl-st-cap">${esc(e.label)}</span>${isPlaced ? '<span class="wl-st-on">On</span>' : ''}`;
      // The shipped book tile's click, verbatim in behaviour (js/controller.js ctlRenderStickerBook).
      b.addEventListener('click', () => {
        playPillClick();
        ctlStickerDispatch({ t: 'bookTap', id: e.id });
        const m = ctlStickerMode(ctlStickerState);
        ctlStickerSay(m === 'armed' ? 'Tap the controller to put it on.'
                    : m === 'selected' ? 'Tap somewhere else to move it.' : '');
        if (m === 'selected') ctlStickerGoToModel(ctlStickerState.stickers[ctlStickerState.selected]);
      });
      box.appendChild(b);
    }
  }

  /* The shipped ctlSyncStickerControls, with a title and a picture added. */
  function paintInspector(d) {
    const insp = room.querySelector('[data-insp]');
    if (!insp) return;
    const mode = ctlStickerMode(ctlStickerState);
    const editing = mode !== 'idle';
    const canUndo = ctlStickerState.history.length > 0;
    insp.classList.toggle('editing', editing);
    insp.classList.toggle('live', editing || canUndo);
    const sl = insp.querySelector('[data-insp-sliders]');
    if (sl) sl.hidden = !editing;
    REFS.done.style.display = editing ? '' : 'none';
    REFS.del.style.display = mode === 'selected' ? '' : 'none';
    REFS.undo.style.display = canUndo ? '' : 'none';

    const id = mode === 'armed' ? ctlStickerState.armed
             : mode === 'selected' ? (ctlStickerState.stickers[ctlStickerState.selected] || {}).id : null;
    const e = id && ctlStickerManifest ? ctlStickerManifest.find(x => x.id === id) : null;
    const img = insp.querySelector('[data-dyn="inspimg"]');
    if (img) { img.hidden = !e; if (e) img.src = CTL_STICKER_DIR + e.image; }
    const n = ctlStickerState.stickers.length;
    const k = insp.querySelector('[data-dyn="inspkick"]');
    if (k) k.textContent = e ? (mode === 'armed' ? 'In your hand' : 'On the controller') : 'Stickers';
    const t = insp.querySelector('[data-dyn="insptitle"]');
    if (t) t.textContent = e ? e.label : (n ? n + ' on the controller' : 'Nothing on it yet');

    const sel = ctlStickerState.stickers[ctlStickerState.selected];
    if (mode === 'selected' && sel) {
      REFS.rot.value = String(Math.round(sel.rot * 180 / Math.PI));
      if (ctlGeo) {
        const U = ctlGeo.userData, r = sel.surface === 'shell' ? sel.size : sel.r;
        REFS.size.value = String(Math.round(r * 1.96 / (U.maxx - U.minx) * 100));
      }
    }
  }

  function paintSay() {
    const idle = ctlStickerMode(ctlStickerState) === 'idle';
    room.querySelectorAll('[data-dyn="say"]').forEach(e => { e.textContent = lastSay; });
    room.querySelectorAll('[data-dyn="sayidle"]').forEach(e => {
      e.textContent = idle ? (lastSay || 'Pick a sticker, then tap the controller.') : 'Tap the controller to put it on.';
    });
  }

  function switchTab(tab) {
    if (tab === ctlActiveTab) { render(); return; }
    playPillClick();
    ctlActiveTab = tab;
    if (tab === 'stickers') window.ctlOpenStickersTab();
    else { ctlStickerDispatch({ t: 'done' }); render(); }
  }

  // ── Wiring ─────────────────────────────────────────────────────────────────
  room.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) { switchTab(t.dataset.tab); return; }
    const dice = e.target.closest('[data-act="random"]');
    if (dice) {
      dice.classList.remove('rolling'); void dice.offsetWidth; dice.classList.add('rolling');   // re-trigger
      ctlRandomiseAll();
    }
  });
  document.querySelectorAll('.wl-lab [data-design]').forEach(b =>
    b.addEventListener('click', () => setDesign(b.dataset.design)));
  window.addEventListener('hashchange', () => setDesign(designFromHash()));

  let toastT = null;
  function toast(msg) {
    const el = $('wl-toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // Screenshot hooks (visual-workshop.js)
  window.wlDebug = {
    setDesign, render,
    paint(design) { Object.assign(ctlDraft, design); ctlApplyDesign(ctlDraft); render(); },
    tab: switchTab,
  };

  boot().catch(err => { console.error(err); toast(String(err)); });
})();
