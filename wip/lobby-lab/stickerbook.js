// ═══════════════════════════════════════════════════════════════════════════
// stickerbook.js — the flat stickerbook, the binder door's destination.
// PROTOTYPE, sandbox only. Spec: docs/superpowers/specs/2026-09-23-stickerbook-achievements-design.md § 3
//
// A VIEW. It renders the facts achievements.js derives and reports intents —
// place, devAdd, reset, close — through onIntent. It holds no progress of its
// own: the page owns the state and hands it back through render(). The only
// state here is presentation (which spread is showing, a drag in progress).
//
// Drawn as the owner's mockup (lounge props/binder/binder.jpg): a quilted
// butter-yellow binder, the sticker TRAY on the inside cover, two pages of 2×2
// clear sleeves. Earned stickers wait in the tray; drag one onto its own
// sleeve (it glows) or tap it and it flies there. Motion is transform/opacity
// only, and reduced motion is checked here in JS: placing still happens,
// nothing travels.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const PEEL_MS = 320, TOAST_MS = 2600, DRAG_PX = 6;

  function sbMount(root, opts) {
    const A = window.Achievements, book = opts.book, base = opts.base || '';
    const onIntent = typeof opts.onIntent === 'function' ? opts.onIntent : () => {};
    const reduced = () => (typeof opts.reduced === 'function' ? opts.reduced() : !!opts.reduced);
    const narrow = () => { try { return window.matchMedia('(max-width: 719px)').matches; } catch (_) { return window.innerWidth < 720; } };
    const perView = () => (narrow() ? 1 : 2);
    let state = A.ACH_EMPTY, page = 0, open = false, busy = false, drag = null;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const img = e => base + e.image;

    root.innerHTML = `
      <div class="sb" role="dialog" aria-modal="true" aria-labelledby="sb-title">
        <div class="sb-head">
          <div>
            <h2 id="sb-title" class="sb-title">Sticker Book</h2>
            <p class="sb-sub">Play games to earn stickers, then peel them onto their page.</p>
          </div>
          <button class="sb-x" id="sb-close" aria-label="Close the sticker book">✕</button>
        </div>
        <div class="sb-binder">
          <section class="sb-tray" aria-label="Sticker tray">
            <p class="sb-tray-label">Sticker Tray</p>
            <div class="sb-tray-list" id="sb-tray"></div>
            <p class="sb-tray-empty" id="sb-tray-empty">Nothing waiting. Go play something!</p>
          </section>
          <div class="sb-spread" id="sb-spread"></div>
        </div>
        <div class="sb-foot">
          <div class="sb-nav">
            <button class="sb-arrow" id="sb-prev" aria-label="Previous pages">‹</button>
            <span class="sb-pages" id="sb-pages"></span>
            <button class="sb-arrow" id="sb-next" aria-label="Next pages">›</button>
          </div>
          <div class="sb-progress">
            <span>Progress</span>
            <div class="sb-bar" role="progressbar" aria-label="Achievements complete" id="sb-bar"><i id="sb-bar-fill"></i></div>
            <span id="sb-count"></span>
          </div>
        </div>
        <details class="sb-dev" id="sb-dev">
          <summary>Dev panel (sandbox)</summary>
          <div class="sb-dev-row">
            <select id="sb-dev-game" aria-label="Game"></select>
            <button data-dev="1">+1 play</button><button data-dev="5">+5 plays</button><button data-dev="-1">−1</button>
            <button id="sb-dev-reset" class="sb-dev-reset">Reset all</button>
          </div>
        </details>
        <div class="sb-pop" id="sb-pop" role="status" hidden></div>
        <div class="sb-toast" id="sb-toast" role="status" aria-live="polite"></div>
      </div>`;
    const $ = sel => root.querySelector(sel);
    const trayEl = $('#sb-tray'), spreadEl = $('#sb-spread'), popEl = $('#sb-pop'), toastEl = $('#sb-toast');
    $('#sb-dev-game').innerHTML = book.entries.map(e => `<option value="${esc(e.id)}">${esc(e.label)}</option>`).join('');

    // ── rendering ─────────────────────────────────────────────────────────
    function sleeveHTML(slot) {
      const e = book.entries[slot];
      if (!e) return `<div class="sb-sleeve" data-state="empty" aria-hidden="true"></div>`;
      const st = A.achStatus(book, state, e.id), full = A.achComplete(book, state, e.id);
      const stars = A.achTiers(book, state, e.id).map(t => `<b class="${t.done ? 'on' : ''}">★</b>`).join('');
      const kind = st === 'placed' ? 'placed' : st === 'tray' ? 'ready' : 'locked';
      const what = kind === 'placed' ? e.label : kind === 'ready' ? `${e.label}, ready to place` : `${e.label}, locked`;
      return `<button class="sb-sleeve" data-state="${kind}" data-id="${esc(e.id)}" aria-label="${esc(what)}">
          ${full ? '<span class="sb-tag">100% Complete <span aria-hidden="true">🏆</span></span>' : ''}
          <img class="sb-art" src="${esc(img(e))}" alt="" draggable="false">
          <span class="sb-name">${esc(e.label)}</span>
          ${kind === 'placed' ? `<span class="sb-stars" aria-hidden="true">${stars}</span>` : kind === 'ready' ? '<span class="sb-ready">Ready to place</span>' : '<span class="sb-lock" aria-hidden="true">🔒</span>'}
        </button>`;
    }
    function render() {
      const pv = perView(), pages = Math.max(1, book.pages);
      page = Math.max(0, Math.min(page - (page % pv), (Math.ceil(pages / pv) - 1) * pv));
      let html = '';
      for (let p = page; p < page + pv; p++) {
        let s = ''; for (let k = 0; k < A.ACH_PER_PAGE; k++) s += sleeveHTML(p * A.ACH_PER_PAGE + k);
        html += `<div class="sb-page" data-page="${p}">${p < pages ? s : ''}</div>`;
      }
      spreadEl.innerHTML = html; spreadEl.dataset.per = pv;
      const tray = A.achTray(book, state);
      trayEl.innerHTML = tray.map((id, i) => { const e = book.byId[id];
        return `<button class="sb-tray-item" data-id="${esc(id)}" style="--tilt:${[-7, 5, -3, 8, -5][i % 5]}deg" aria-label="Place the ${esc(e.label)} sticker"><img src="${esc(img(e))}" alt="" draggable="false"></button>`; }).join('');
      $('#sb-tray-empty').hidden = tray.length > 0;
      const shown = Math.min(pages, page + pv);
      $('#sb-pages').textContent = pv === 1 || page + 1 >= pages ? `Page ${page + 1} of ${pages}` : `Pages ${page + 1} & ${page + 2} of ${pages}`;
      $('#sb-prev').disabled = page === 0; $('#sb-next').disabled = shown >= pages;
      const pr = A.achProgress(book, state), pct = pr.total ? Math.round(100 * pr.done / pr.total) : 0;
      $('#sb-bar-fill').style.transform = `scaleX(${pct / 100})`; $('#sb-bar').setAttribute('aria-valuenow', String(pct));
      $('#sb-count').textContent = `${pr.done} / ${pr.total}`;
    }
    const pageOf = id => Math.floor(book.byId[id].slot / A.ACH_PER_PAGE);
    const showPageOf = id => { const pv = perView(), p = pageOf(id); if (p < page || p >= page + pv) { page = p - (p % pv); render(); } };
    const sleeveEl = id => spreadEl.querySelector(`.sb-sleeve[data-id="${CSS.escape(id)}"]`);

    // ── the pop-over: a hint for a locked sleeve, the tiers for a placed one
    function pop(el, html) {
      popEl.innerHTML = html; popEl.hidden = false;
      const r = el.getBoundingClientRect(), R = root.querySelector('.sb').getBoundingClientRect();
      const w = Math.min(240, R.width - 24);
      popEl.style.width = w + 'px';
      popEl.style.left = Math.max(12, Math.min(R.width - w - 12, r.left - R.left + r.width / 2 - w / 2)) + 'px';
      popEl.style.top = Math.max(12, r.top - R.top - 8) + 'px';
    }
    const unpop = () => { popEl.hidden = true; };
    function explain(id, el) {
      const e = book.byId[id], st = A.achStatus(book, state, id);
      if (st === 'locked') { pop(el, `<p class="sb-pop-h">${esc(e.label)} <span class="sb-pop-dim">(locked)</span></p><p>${esc(A.achHint(book, state, id))}.</p>`); return; }
      if (st === 'tray') { pop(el, `<p class="sb-pop-h">${esc(e.label)}</p><p>It's in your tray. Peel it off and stick it here.</p>`);
        const t = trayEl.querySelector(`[data-id="${CSS.escape(id)}"]`); if (t) { t.classList.remove('sb-nudge'); void t.offsetWidth; t.classList.add('sb-nudge'); } return; }
      const n = A.achPlays(state, id);
      const rows = A.achTiers(book, state, id).map(t => `<li class="${t.done ? 'done' : ''}"><b>★</b> Play ${t.need === 1 ? 'once' : t.need + ' times'} <span>${Math.min(n, t.need)}/${t.need}</span></li>`).join('');
      pop(el, `<p class="sb-pop-h">${esc(e.label)}</p><ul class="sb-tiers">${rows}</ul><p class="sb-pop-dim">${esc(A.achHint(book, state, id))}</p>`);
    }

    // ── placing: the tap path (fly) and the drag path share one ending
    function flyGhost(ghost, from, to, ms, done) {
      ghost.style.transition = `transform ${ms}ms cubic-bezier(.45,0,.25,1), opacity ${ms}ms ease-out`;
      const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2), k = to.width / from.width;
      requestAnimationFrame(() => { ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${k}) rotate(0deg)`; });
      later(done, ms);
    }
    /* Measure BEFORE the book turns. showPageOf() re-renders, which rebuilds the
       tray: the item a gesture started on is then detached — a 0×0 rect at
       (0, 0), and pointer capture released with it (review finding, 23 Sep
       2026). So the ghost is cut from the live item first, and anything that
       needs the item afterwards looks it up again by id. */
    function makeGhost(srcEl) {
      const r = srcEl.getBoundingClientRect(), g = srcEl.querySelector('img').cloneNode();
      g.className = 'sb-ghost'; Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      document.body.appendChild(g); return { g, r };
    }
    const trayItemOf = id => trayEl.querySelector(`.sb-tray-item[data-id="${CSS.escape(id)}"]`);
    const hideTrayItem = (id, hidden) => { const it = trayItemOf(id); if (it) it.style.visibility = hidden ? 'hidden' : ''; };
    function commitPlace(id) {
      busy = false;
      if (A.achStatus(book, state, id) !== 'tray') return;     // the reducer refuses too; this keeps a stale view honest
      onIntent({ t: 'place', id });
      later(() => { const s = sleeveEl(id); if (s && !reduced()) { s.classList.add('sb-settle'); later(() => s.classList.remove('sb-settle'), 400); } }, 0);
    }
    function tapPlace(id) {
      const item = trayItemOf(id);
      if (busy || !item || A.achStatus(book, state, id) !== 'tray') return;
      unpop();
      if (reduced()) { showPageOf(id); commitPlace(id); return; }
      busy = true;
      const { g, r } = makeGhost(item);                         // measured on the live item...
      showPageOf(id); hideTrayItem(id, true);                   // ...then the book turns
      const target = sleeveEl(id);
      if (!target) { g.remove(); commitPlace(id); return; }
      g.classList.add('sb-peeling');
      flyGhost(g, r, target.querySelector('.sb-art').getBoundingClientRect(), PEEL_MS, () => { g.remove(); commitPlace(id); });
    }

    // ── pointer: drag a tray sticker, or tap it. Down on the tray; move/up on
    //    WINDOW, so a re-render under the gesture cannot orphan it.
    const clearTargets = () => spreadEl.querySelectorAll('.sb-target').forEach(n => n.classList.remove('sb-target'));
    function onTrayDown(ev) {
      const item = ev.target.closest('.sb-tray-item');
      if (!item || busy || drag) return;                        // one gesture at a time: a second finger is ignored
      ev.preventDefault();
      drag = { id: item.dataset.id, x: ev.clientX, y: ev.clientY, moving: false, ghost: null, r: null, pid: ev.pointerId };
    }
    function onTrayMove(ev) {
      if (!drag || ev.pointerId !== drag.pid) return;
      const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      if (!drag.moving) {
        if (Math.hypot(dx, dy) < DRAG_PX) return;
        const item = trayItemOf(drag.id); if (!item) { drag = null; return; }
        drag.moving = true; unpop();
        const m = makeGhost(item); drag.ghost = m.g; drag.r = m.r;
        drag.ghost.classList.add('sb-peeling', 'sb-held');
        showPageOf(drag.id); hideTrayItem(drag.id, true);
        const s = sleeveEl(drag.id); if (s) s.classList.add('sb-target');
      }
      drag.ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.08) rotate(-6deg)`;
    }
    function onTrayUp(ev) {
      if (!drag || ev.pointerId !== drag.pid) return;
      const d = drag; drag = null;
      clearTargets();
      if (!d.moving) { tapPlace(d.id); return; }
      d.ghost.style.display = 'none'; const hit = document.elementFromPoint(ev.clientX, ev.clientY); d.ghost.style.display = '';
      const sleeve = hit && hit.closest('.sb-sleeve');
      busy = true;
      if (sleeve && sleeve.dataset.id === d.id) {
        if (reduced()) { d.ghost.remove(); commitPlace(d.id); return; }
        flyGhostFrom(d.ghost, d.r, sleeve.querySelector('.sb-art').getBoundingClientRect(), 180, () => { d.ghost.remove(); commitPlace(d.id); });
      } else {
        /* Not its sleeve: spring back to the tray. Nothing is placed. */
        const back = () => { d.ghost.remove(); hideTrayItem(d.id, false); busy = false; };
        if (reduced()) { back(); return; }
        d.ghost.style.transition = `transform 220ms cubic-bezier(.3,1.4,.5,1)`;
        requestAnimationFrame(() => { d.ghost.style.transform = 'translate(0px, 0px) scale(1) rotate(var(--tilt, 0deg))'; });
        later(back, 230);
      }
    }
    function onTrayCancel(ev) {
      if (!drag || ev.pointerId !== drag.pid) return;           // someone else's pointer: not ours to cancel
      if (drag.ghost) { drag.ghost.remove(); hideTrayItem(drag.id, false); }
      drag = null; clearTargets();
    }
    function flyGhostFrom(ghost, r0, to, ms, done) {
      const dx = to.left + to.width / 2 - (r0.left + r0.width / 2), dy = to.top + to.height / 2 - (r0.top + r0.height / 2), k = to.width / r0.width;
      requestAnimationFrame(() => { ghost.style.transition = `transform ${ms}ms ease-out`; ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${k}) rotate(0deg)`; });
      later(done, ms);
    }
    trayEl.addEventListener('pointerdown', onTrayDown);
    window.addEventListener('pointermove', onTrayMove);
    window.addEventListener('pointerup', onTrayUp);
    window.addEventListener('pointercancel', onTrayCancel);
    /* Keyboard: Enter/Space on a tray item is the tap path. */
    trayEl.addEventListener('keydown', ev => { const item = ev.target.closest('.sb-tray-item'); if (item && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); tapPlace(item.dataset.id); } });

    spreadEl.addEventListener('click', ev => { const s = ev.target.closest('.sb-sleeve[data-id]'); if (!s) return; if (!popEl.hidden && popEl.dataset.for === s.dataset.id) { unpop(); popEl.dataset.for = ''; return; } explain(s.dataset.id, s); popEl.dataset.for = s.dataset.id; });
    root.querySelector('.sb').addEventListener('click', ev => { if (!ev.target.closest('.sb-sleeve') && !ev.target.closest('.sb-pop')) unpop(); });
    $('#sb-prev').addEventListener('click', () => { page = Math.max(0, page - perView()); unpop(); render(); });
    $('#sb-next').addEventListener('click', () => { page += perView(); unpop(); render(); });
    $('#sb-close').addEventListener('click', () => onIntent({ t: 'close' }));
    $('#sb-dev').addEventListener('click', ev => { const b = ev.target.closest('[data-dev]'); if (b) onIntent({ t: 'devAdd', id: $('#sb-dev-game').value, n: +b.dataset.dev }); });
    $('#sb-dev-reset').addEventListener('click', () => onIntent({ t: 'reset' }));
    const onKey = ev => { if (open && ev.key === 'Escape') onIntent({ t: 'close' }); };
    const onResize = () => { if (open) render(); };
    window.addEventListener('keydown', onKey); window.addEventListener('resize', onResize);

    function toast(list) {
      if (!list || !list.length) return;
      const msgs = list.map(t => { const e = book.byId[t.id]; return t.tier === 0 ? `New sticker! ${e.label}` : `${'★'.repeat(t.tier + 1)} ${e.label}`; });
      toastEl.textContent = msgs.slice(0, 2).join('  ·  ') + (msgs.length > 2 ? `  +${msgs.length - 2}` : '');
      toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
      later(() => toastEl.classList.remove('on'), TOAST_MS);
    }

    return {
      /* The page's one way in: here is the state, and (optionally) what just changed. */
      render(next, info) { state = next || A.ACH_EMPTY; if (open) render(); if (info && info.toast) toast(info.toast); },
      open() { if (open) return; open = true; root.hidden = false; unpop(); render(); root.classList.remove('sb-in'); void root.offsetWidth; root.classList.add('sb-in'); const x = $('#sb-close'); try { x.focus({ preventScroll: true }); } catch (_) {} },
      close() { if (!open) return; open = false; root.hidden = true; unpop(); drag = null; busy = false; timers.forEach(clearTimeout); timers.clear(); document.querySelectorAll('.sb-ghost').forEach(n => n.remove()); },
      isOpen: () => open,
      page: () => page,
      toast,
      dispose() { this.close(); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onTrayMove); window.removeEventListener('pointerup', onTrayUp); window.removeEventListener('pointercancel', onTrayCancel); root.innerHTML = ''; },
    };
  }

  window.Stickerbook = { sbMount };
})();
