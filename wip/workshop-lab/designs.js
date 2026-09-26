/* ═══════════════════════════════════════════════════════════════════════════
   designs.js — SANDBOX. Phone layouts for the Workshop (below 860 px).

   The widescreen round (A · Bench, B · Paint Shop, C · Craft Mat) is archived
   in widescreen-round/ — B shipped at SW v234 and IS the real screen now.

   A phone design is:
     label / pitch / gains / costs   what the review page (index.html) shows;
     mount(ws, H)                    rearranges the SHIPPED #screen-workshop,
                                     once, before the Workshop opens.
   Its look is CSS under #screen-workshop[data-phone="<key>"] in
   workshop-lab.css. Every node a design moves is a shipped node with an id —
   ctlRenderPanel repaints it wherever it ends up.

   Shared ground for all three, from DD-45 and the owner's brief:
   · the controller stays on screen while a sticker is placed — the tap that
     puts it on lands on the model;
   · the stage keeps touch-action:none — a drag on it turns the controller;
   · the sticker surface is still paid on the first pick-up, never on open
     (no design here calls ctlEnsureStickerSurface or ctlStickerPickUp);
   · Save is the controller's yellow key, Remove its pink one — unchanged.
   ═══════════════════════════════════════════════════════════════════════════ */

/* A two-way segmented control. The sticker count rides on the Stickers side. */
function wpSeg(ws, H, onPick) {
  const seg = H.el(`
    <div class="wp-seg" role="tablist" aria-label="Tools">
      <button role="tab" data-tab="paint">🎨 Paint</button>
      <button role="tab" data-tab="stickers">⭐ Stickers</button>
    </div>`);
  seg.children[1].appendChild(H.n['ctl-sticker-count']);
  const set = (tab, quiet) => {
    if (tab === ws.dataset.tab) { if (onPick) onPick(tab, true); return; }
    if (!quiet) playPillClick();
    if (tab !== 'stickers') H.putDown();
    ws.dataset.tab = tab;
    seg.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    if (onPick) onPick(tab, false);
  };
  seg.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) set(b.dataset.tab); });
  /* Tapping a placed sticker on the model selects it (ctlStickerTap) — with
     the Paint side showing, the card for it would be hidden. Follow it. */
  H.onRender.push(() => { if (H.mode() !== 'idle' && ws.dataset.tab !== 'stickers') set('stickers', true); });
  set('paint', true);
  return seg;
}

const WP_DESIGNS = {

  /* ── The stand-in (as shipped at v234) ────────────────────────────────── */
  standin: {
    label: 'Stand-in',
    tag: 'as shipped, v234',
    pitch: 'The widescreen room stacked: the stage pinned on top, paint then stickers scrolling under it.',
    gains: ['Nothing to learn — it is design B, one column.', 'Everything reachable by scrolling.'],
    costs: ['The sticker sheet starts a long scroll down — below Paint\'s whole palette.',
            'Save lives on the stage, not in the thumb zone; the page scrolls under a pinned stage.'],
    mount() {},
  },

  /* ── P1 · Pocket ──────────────────────────────────────────────────────────
     The phone app everyone already knows: the controller in a fixed window at
     the top, the two jobs as a segmented control under it, the panel scrolling
     inside itself, and Save in a footer under the thumb. Tabs come back on a
     phone because there is no room for both — but the stage never moves. */
  pocket: {
    label: 'P1 · Pocket',
    tag: 'fixed split + tabs',
    pitch: 'The controller in a fixed window up top; Paint | Stickers as tabs underneath; Save in a footer.',
    gains: ['The stage never moves or resizes — nothing jumps, ever.',
            'Save and Reset sit in the thumb zone on every tab.',
            'Least new UI: a tab bar and a footer.'],
    costs: ['Tabs again — the one thing design B got rid of.',
            'The stage is ~40% of the screen even while sticking, where it matters most.'],
    mount(ws, H) {
      const body = H.q('.wks-body'), view = H.q('.wks-view');
      H.q('.wks-hint').textContent = 'Drag to turn · pinch to zoom';
      const seg = wpSeg(ws, H);
      // Randomise All joins the "Shell · Cold Shoulder" line, so the whole
      // palette clears the fold without scrolling the pane.
      const pick = H.el('<div class="wp-pickrow"></div>');
      H.n['ctl-picked'].replaceWith(pick);
      pick.append(H.n['ctl-picked'], H.n['btn-ctl-randomise']);
      const panes = H.el('<div class="wp-panes"></div>');
      panes.append(H.q('.wks-paint'), H.q('.wks-stickers'));
      body.append(view, seg, panes);
      const till = H.q('.wks-till'), foot = H.el('<div class="wp-foot"></div>');
      foot.append(...till.children); till.remove();
      ws.append(foot);
    },
  },

  /* ── P2 · Drawer ──────────────────────────────────────────────────────────
     The controller gets the whole screen; the tools are a sheet you pull up
     over the bottom of it. Two rests: tucked (just the tabs and Save) and
     open (the tools). With a sticker in hand the sheet shrinks on its own to
     the card for that sticker — so placing it has the most controller of any
     design — and goes back to where it was on Done. */
  drawer: {
    label: 'P2 · Drawer',
    tag: 'full stage + pull-up sheet',
    pitch: 'The controller fills the screen; the tools are a sheet you pull up. Picking a sticker shrinks it to the sticker\'s card.',
    gains: ['Most controller of any design, and the most while placing a sticker.',
            'Tucked away, it is a showroom — the model alone, one tap from Save.'],
    costs: ['Two ways to move the sheet (the grab bar, a tab) are one more thing to learn.',
            'The model re-fits when the sheet rests — a small jump each time.'],
    mount(ws, H) {
      const body = H.q('.wks-body');
      H.q('.wks-hint').textContent = 'Drag to turn · pinch to zoom';
      const sheet = H.el(`
        <div class="wp-sheet">
          <button class="wp-grab" aria-label="Pull the tools up or down"><i></i></button>
          <div class="wp-sheet-top"></div>
          <div class="wp-panes"></div>
        </div>`);
      const top = sheet.querySelector('.wp-sheet-top'), panes = sheet.querySelector('.wp-panes');
      const rest = s => { ws.dataset.sheet = s; sheet.querySelector('.wp-grab').setAttribute('aria-expanded', String(s === 'open')); };
      // A tab tap on a tucked sheet opens it; on an open sheet it just switches.
      top.append(wpSeg(ws, H, () => { if (ws.dataset.sheet !== 'open') rest('open'); }));
      top.append(H.n['btn-ctl-save']);
      const paint = H.q('.wks-paint');
      panes.append(paint, H.q('.wks-stickers'));
      // Randomise All and Reset share a row at the foot of Paint.
      const row = H.el('<div class="wp-row"></div>');
      row.append(H.n['btn-ctl-randomise'], H.n['btn-ctl-reset']);
      paint.append(row);
      // The sticker card is the sheet's third face, not part of the Stickers pane.
      sheet.append(H.n['ctl-sticker-controls']);
      H.q('.wks-till').remove();
      body.append(sheet);
      rest('tucked');
      ws.dataset.tab = '';           // tucked: no tab lit until one is asked for
      sheet.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', 'false'));
      // Sideways the sheet is a side panel that is always open — so show Paint in it.
      if (matchMedia('(orientation: landscape) and (max-height: 500px)').matches) {
        sheet.querySelector('[data-tab="paint"]').click();
      }

      // The grab bar: a tap toggles; a flick up/down sets it.
      const grab = sheet.querySelector('.wp-grab');
      let y0 = null;
      grab.addEventListener('pointerdown', e => { y0 = e.clientY; });
      grab.addEventListener('pointerup', e => {
        if (y0 === null) return;
        const dy = e.clientY - y0; y0 = null;
        const next = Math.abs(dy) < 12 ? (ws.dataset.sheet === 'open' ? 'tucked' : 'open') : (dy < 0 ? 'open' : 'tucked');
        if (next === ws.dataset.sheet) return;
        playPillClick();
        if (next === 'tucked') H.putDown();
        else if (!ws.dataset.tab) sheet.querySelector('[data-tab="paint"]').click();
        rest(next);
      });
    },
  },

  /* ── P3 · Tool Belt ───────────────────────────────────────────────────────
     Design B's own rule — both jobs on screen at once, no tabs — kept on a
     phone by turning each job into a strip you swipe sideways: the paint as
     four part chips over a row of swatches, the stickers as a film strip.
     A sticker in hand swaps the paint strip for that sticker's card, in the
     same slot, so nothing else on screen moves. */
  belt: {
    label: 'P3 · Tool Belt',
    tag: 'no tabs · swipe strips',
    pitch: 'No tabs, like widescreen: paint and stickers are both on screen as sideways strips under the controller.',
    gains: ['Keeps widescreen\'s rule — both jobs at once, nothing hidden behind a tab.',
            'One screen, no vertical scroll; Save in the thumb zone.',
            'A sticker in hand swaps into the paint slot — nothing else moves.'],
    costs: ['Swatches and stickers are swiped sideways; you see ~6 of each at a time.',
            'Densest of the three; on a small phone (640 tall) the stage gets tight.'],
    mount(ws, H) {
      const body = H.q('.wks-body'), view = H.q('.wks-view');
      H.q('.wks-hint').textContent = 'Drag to turn · pinch to zoom';
      const paint = H.q('.wks-paint'), stick = H.q('.wks-stickers');
      // Paint: the die leads the swatch strip.
      const strip = H.el('<div class="wp-strip"></div>');
      strip.append(H.n['btn-ctl-randomise'], H.n['ctl-palette']);
      H.q('.wks-pal-wrap').append(strip);
      // The tray holds the paint strip OR the sticker in hand — same slot.
      const tray = H.el('<div class="wp-tray"></div>');
      tray.append(paint, H.n['ctl-sticker-controls']);
      // Stickers: one head row — the kicker, the running line, Undo.
      const head = H.el('<div class="wp-belt-head"></div>');
      head.append(H.q('.wks-stickers .wks-kicker'), H.n['ctl-sticker-say'],
                  H.n['btn-ctl-sticker-undo']);
      stick.prepend(head);
      body.append(view, tray, stick);
      const till = H.q('.wks-till'), foot = H.el('<div class="wp-foot"></div>');
      foot.append(...till.children); till.remove();
      ws.append(foot);
    },
  },
};
