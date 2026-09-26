/* ═══════════════════════════════════════════════════════════════════════════
   workshop-lab.js — SANDBOX. Boots the REAL Workshop, then applies one phone
   design to it (room.html?phone=…).

   Rebased on the SW v234 port. Nothing here paints anything: the shipped
   ctlRenderPanel repaints every region BY ID (#ctl-parts, #ctl-palette,
   #ctl-sticker-book, #ctl-sticker-controls …), so a design is free to MOVE
   those nodes wherever it likes and they keep working — listeners and all.
   A design is therefore CSS (workshop-lab.css, under [data-phone="…"]) plus a
   small mount() in designs.js that rearranges and adds chrome.

   What the lab adds on top of the shipped code, and each is a port item:
     1. data-st / data-undo on #screen-workshop after every ctlRenderPanel —
        the sticker mode as an attribute, so CSS can swap trays on it;
     2. a ResizeObserver on #ctl-stage — controller.js only resizes the
        renderer on window resize, and a phone design can change the stage's
        box without one (a drawer snapping, a tray swapping);
     3. ctlCloseWorkshop → a toast: there is no room to go back to (lab only);
     4. ctlResize fits a tall stage by width (phone designs only).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const key = WP_DESIGNS[params.get('phone')] ? params.get('phone') : 'standin';

  function load(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('lab: failed to load ' + src));
      document.body.appendChild(s);
    });
  }

  // Helpers handed to a design's mount().
  const H = {
    q: sel => document.querySelector('#screen-workshop ' + sel),
    el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; },
    /* The sticker mode, as the shipped reducer sees it. */
    mode: () => ctlStickerMode(ctlStickerState),
    /* The old tab's one side effect, kept: leaving the stickers with one in
       hand puts it down (ctlStickerDispatch 'done'). Never builds the surface. */
    putDown() { if (ctlStickerMode(ctlStickerState) !== 'idle') ctlStickerDispatch({ t: 'done' }); },
    onRender: [],
  };

  async function boot() {
    const [shell, sound] = await Promise.all([
      fetch('src/screens/_shell.html').then(r => r.text()),
      fetch('src/screens/_sound.html').then(r => r.text()),
    ]);
    // #btn-mute lives in a GAME partial and engine.js wires it unguarded at boot.
    $('wl-live').innerHTML = shell + sound + '<button id="btn-mute" hidden aria-hidden="true">🔊</button>';

    await load('js/lib/music.js');
    await load('js/engine.js');
    await load('js/lobby/lobby-games.js');          // colour names (ctlColourName reads GAMES)
    await load('js/lib/controller-sticker-surface.js');
    await load('js/controller.js');
    // secret-mode.js is not loaded: a Konami press would call into nothing.
    if (typeof window.smHandleButton !== 'function') window.smHandleButton = () => {};

    const ws = $('screen-workshop');
    ws.dataset.phone = key;
    if (key !== 'standin') ws.classList.add('wp');   // the phone designs' shared base

    // ── 1. the sticker mode as an attribute, after every repaint ──
    const shipped = window.ctlRenderPanel;
    window.ctlRenderPanel = function () {
      shipped();
      if (!ctlDraft) return;
      ws.dataset.st = ctlStickerMode(ctlStickerState);
      ws.dataset.undo = String(ctlStickerState.history.length > 0);
      H.onRender.forEach(f => f());
    };

    // Every id'd node, captured BEFORE a design moves anything: once a panel is
    // inside a wrapper that is not attached yet, getElementById cannot see it.
    H.n = {};
    ws.querySelectorAll('[id]').forEach(e => { H.n[e.id] = e; });
    // The design rearranges BEFORE the open, so ctlMount measures the final box.
    WP_DESIGNS[key].mount(ws, H);

    // ── 2. resize the renderer whenever the stage's box changes ──
    if ('ResizeObserver' in window) new ResizeObserver(() => ctlResize()).observe($('ctl-stage'));

    // ── 4. a camera that fits a TALL stage by width ──
    // The shipped fit is two steps (w/h < 0.9 ? 12 : 9.5), sized for the old
    // 340 px stage and widescreen. A phone stage can be 0.65 — the drawer's,
    // with a sticker in hand — and at 12 the grips run off both edges. Below
    // ~0.78 the distance now grows with 1/aspect, so the body's width fits.
    if (key !== 'standin') {
      window.ctlResize = function () {
        if (!ctlMountEl || !ctlBuilt) return;
        const w = ctlMountEl.clientWidth, h = ctlMountEl.clientHeight;
        if (!w || !h) return;
        const a = w / h;
        ctlRenderer.setSize(w, h, false);
        ctlCamera.aspect = a;
        ctlCamera.position.set(0, 0.4, (a < 0.9 ? Math.max(12, 9.4 / a) : 9.5) * ctlZoom);
        ctlCamera.lookAt(0, -0.2, 0);
        ctlCamera.updateProjectionMatrix();
        ctlWake();
      };
    }

    // ── 3. no room to go back to ──
    let saved = false;
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#btn-ctl-save')) saved = true; }, true);
    window.ctlCloseWorkshop = () => {
      toast(saved ? 'Saved. In the app the Workshop now closes back to the room it opened from.'
                  : 'In the app, ✕ closes without saving.');
      saved = false;
    };

    window.ctlOpenWorkshop({ onReturn: () => {} });
    window.wlReady = true;
  }

  let toastT = null;
  function toast(msg) {
    const el = $('wl-toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // Screenshot hooks (visual-workshop.js)
  window.wlDebug = {
    key,
    paint(design) { Object.assign(ctlDraft, design); ctlApplyDesign(ctlDraft); ctlRenderPanel(); },
  };

  boot().catch(err => { console.error(err); toast(String(err)); });
})();
