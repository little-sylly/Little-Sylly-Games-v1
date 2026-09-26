// ═══════════════════════════════════════════════════════════════════════════
// designs.js — SANDBOX. Four ways to pick a song, each a function
// (root, ctx) → { sync(state), destroy?() }. jukebox.js owns the frame, the
// player and the 3D cat; a design only lays out the catalogue and calls
// ctx.play(id). Swapping designs never touches what is playing.
//
//   A · Crate    flip through records, label-out (refs 1 + 2: the disc carousel)
//   B · Setlist  a filterable, searchable list (refs 1-right + 2: the rows)
//   C · Shelf    one album per game, then its songs (ref 3: the album grid)
//   D · Wallbox  ORIGINAL — the cat's own diner-style selector: paper title
//                strips behind glass, a letter per game, a number per song,
//                dialled on keycaps in the faceplate's own pastels
// ═══════════════════════════════════════════════════════════════════════════
const JBX_DESIGNS = {};

(function () {
  'use strict';

  // ── The rail: a row of chips, no scrollbar ───────────────────────────────
  /* Shared by A and B. Three things a bare overflow row got wrong: it cut a
     chip off hard at the panel's edge (now the edge FADES, and only on a side
     that has more to show); it scrolled the chosen chip flush to an edge (now
     it slides to the middle); and with no scrollbar a mouse had no way to move
     it (now the wheel and a drag both do). Touch scrolls it natively. */
  function jbxRail(ctx, items, onPick, label) {
    const { h } = ctx;
    const wrap = h('div', { class: 'rail' });
    const track = h('div', { class: 'rail-track', role: 'toolbar', 'aria-label': label });
    wrap.append(track);
    const by = {};
    let down = null, dragged = false;
    items.forEach(it => {
      const b = h('button', { class: 'chip' + (it.solo ? ' solo' : '') }, it.kids);
      b.onclick = () => { if (!dragged) onPick(it.id); };
      by[it.id] = b; track.append(b);
    });
    function edges() {
      const max = track.scrollWidth - track.clientWidth;
      track.style.setProperty('--fl', track.scrollLeft > 2 ? '44px' : '0px');
      track.style.setProperty('--fr', track.scrollLeft < max - 2 ? '44px' : '0px');
    }
    track.addEventListener('scroll', edges, { passive: true });
    new ResizeObserver(edges).observe(track);
    track.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // a trackpad's sideways swipe already works
      track.scrollLeft += e.deltaY; e.preventDefault();
    }, { passive: false });
    track.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { down = { x: e.clientX, s: track.scrollLeft }; dragged = false; } });
    const move = e => {
      if (!down) return; const dx = e.clientX - down.x;
      if (Math.abs(dx) > 5) { dragged = true; track.classList.add('dragging'); }
      if (dragged) track.scrollLeft = down.s - dx;
    };
    const up = () => { if (!down) return; down = null; track.classList.remove('dragging'); setTimeout(() => { dragged = false; }, 0); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    function set(id, instant) {
      Object.entries(by).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === id)));
      const b = by[id]; if (!b) return;
      const left = b.offsetLeft - (track.clientWidth - b.offsetWidth) / 2;
      track.scrollTo({ left, behavior: instant || ctx.reduced() ? 'auto' : 'smooth' });
    }
    requestAnimationFrame(edges);
    return { el: wrap, set, destroy() { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); } };
  }

  // ── The pick: A by default, B when you're after something ──────────────
  /* Owner's call (26 Sep): A and B live together. Records is the default —
     browsing — and List is one tap away for finding a particular song; the
     "Find a song" button goes straight there with the search focused. The
     search box outlives the switch, so what you typed is still there. */
  JBX_DESIGNS.picked = function (root, ctx) {
    const { h } = ctx;
    root.classList.add('dP');
    const icon = d => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = d; return s; };
    const DISC = '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>';
    const LIST = '<path d="M5 7h14M5 12h14M5 17h9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';
    const FIND = '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';
    const bRec = h('button', { role: 'tab' }, [icon(DISC), 'Records']);
    const bList = h('button', { role: 'tab' }, [icon(LIST), 'List']);
    const seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'How to look' }, [bRec, bList]);
    const search = h('input', { class: 'dB-search', type: 'search', placeholder: 'Find a song or a game…', 'aria-label': 'Find a song' });
    const find = h('button', { class: 'pk-find', 'aria-label': 'Find a song' }, [icon(FIND), h('span', { class: 'pk-find-t' }, 'Find a song')]);
    const body = h('div', { class: 'pk-body' });
    root.append(h('div', { class: 'pk-head' }, [seg, find, search]), body);

    let inner = null;
    function show(view, focus) {
      if (inner && inner.destroy) inner.destroy();
      const r = h('div', { class: 'd-root' }); body.replaceChildren(r);
      inner = JBX_DESIGNS[view](r, Object.assign({}, ctx, { search, rail: jbxRail }));
      bRec.setAttribute('aria-selected', String(view === 'crate')); bList.setAttribute('aria-selected', String(view === 'setlist'));
      find.style.display = view === 'crate' ? '' : 'none';
      search.style.display = view === 'crate' ? 'none' : '';
      if (focus) search.focus();
      picked.view = view;
    }
    bRec.onclick = () => show('crate');
    bList.onclick = () => show('setlist');
    find.onclick = () => show('setlist', true);
    const picked = { view: null, show, sync: s => inner.sync(s), destroy() { if (inner && inner.destroy) inner.destroy(); } };
    show(ctx.initialView === 'setlist' ? 'setlist' : 'crate');
    return picked;
  };

  // ── A · Crate ────────────────────────────────────────────────────────────
  JBX_DESIGNS.crate = function (root, ctx) {
    const { h, tracks } = ctx;
    const X = [0, 54, 90, 116, 136];               // % of a disc's width each step out
    const S = [1, .74, .58, .48, .4], A = [1, .8, .4, .15, 0];
    let focus = Math.max(0, tracks.findIndex(t => t.id === ctx.state().currentId));
    root.classList.add('dA');

    const rail = jbxRail(ctx, ctx.games.map(g => ({ id: g.id, kids: [ctx.art(g), g.name] })),
      id => go(tracks.findIndex(t => t.game === id)), 'Jump to a game');
    let railGame = null;

    const flow = h('div', { class: 'dA-flow', tabindex: '0', 'aria-label': 'Records. Left and right to flip, Enter to play.' });
    const recs = tracks.map((t, i) => {
      const b = h('button', { class: 'dA-rec', tabindex: '-1', 'aria-label': t.title }, [ctx.disc(t)]);
      b.onclick = () => { if (moved) return; if (i === focus) ctx.play(t.id); else go(i); };
      flow.append(b); return b;
    });
    const L = h('button', { class: 'dA-arrow l', 'aria-label': 'Previous record' }, '‹');
    const R = h('button', { class: 'dA-arrow r', 'aria-label': 'Next record' }, '›');
    L.onclick = () => go(focus - 1); R.onclick = () => go(focus + 1);
    flow.append(L, R);

    const idx = h('div', { class: 'dA-idx' }), title = h('h2', { class: 'dA-title' }), meta = h('p', { class: 'dA-meta' });
    const play = h('button', { class: 'dA-play' });
    play.onclick = () => ctx.play(tracks[focus].id);
    root.append(rail.el, flow, h('div', { class: 'dA-info' }, [idx, title, meta, play]));

    function go(i) { focus = (i + tracks.length) % tracks.length; layout(); }
    function layout() {
      recs.forEach((b, i) => {
        let o = i - focus; const n = tracks.length;
        if (o > n / 2) o -= n; if (o < -n / 2) o += n;   // the crate wraps
        const a = Math.min(Math.abs(o), 4);
        b.style.setProperty('--o', 0);
        b.style.transform = `translate(-50%, -50%) translateX(${Math.sign(o) * X[a]}%) scale(${S[a]})`;
        b.style.opacity = A[a]; b.style.zIndex = 10 - a; b.dataset.o = o;
        b.style.visibility = a >= 4 ? 'hidden' : '';
      });
      const t = tracks[focus];
      idx.textContent = `${focus + 1} / ${tracks.length}`;
      title.textContent = t.title;
      meta.replaceChildren(`${t.g.name} · ${t.artist} · ${ctx.fmt(t.seconds)} `, ...(t.variant ? [h('span', { class: 'tag' }, t.variant)] : []));
      if (t.game !== railGame) { rail.set(t.game, railGame === null); railGame = t.game; }
      paintPlay();
    }
    function paintPlay() {
      const t = tracks[focus], s = ctx.state(), on = s.currentId === t.id;
      play.textContent = t.locked ? '🔒 Still locked' : on ? (s.playing ? 'Pause' : 'Keep playing') : 'Play this one';
      recs.forEach((b, i) => b.firstChild.classList.toggle('spin', s.playing && tracks[i].id === s.currentId));
    }

    // flip by wheel, drag or keys
    let wheelAt = 0, moved = false, down = null;
    flow.addEventListener('wheel', e => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 4) return; e.preventDefault();
      const now = performance.now(); if (now - wheelAt < 160) return; wheelAt = now; go(focus + Math.sign(d));
    }, { passive: false });
    flow.addEventListener('pointerdown', e => { down = { x: e.clientX, f: focus }; moved = false; });
    flow.addEventListener('pointermove', e => {
      if (!down) return; const dx = e.clientX - down.x;
      if (Math.abs(dx) > 8) moved = true;
      const step = Math.round(-dx / 90); if (moved && down.f + step !== focus) go(down.f + step);
    });
    const up = () => { down = null; setTimeout(() => { moved = false; }, 0); };
    flow.addEventListener('pointerup', up); flow.addEventListener('pointercancel', up); flow.addEventListener('pointerleave', up);
    flow.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { go(focus - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { go(focus + 1); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { ctx.play(tracks[focus].id); e.preventDefault(); }
    });

    let lastCurrent = ctx.state().currentId;
    layout();
    return {
      sync(s) {
        if (s.currentId && s.currentId !== lastCurrent) { lastCurrent = s.currentId; focus = tracks.findIndex(t => t.id === s.currentId); layout(); }
        else paintPlay();
      },
      destroy: rail.destroy,
    };
  };

  // ── B · Setlist ─────────────────────────────────────────────────────────
  JBX_DESIGNS.setlist = function (root, ctx) {
    const { h, tracks } = ctx;
    let filter = 'all';
    root.classList.add('dB');

    /* Embedded in the pick, the search box is the pick's (it survives the
       switch); standing alone, B makes its own. */
    const own = !ctx.search;
    const search = ctx.search || h('input', { class: 'dB-search', type: 'search', placeholder: 'Find a song or a game…', 'aria-label': 'Find a song' });
    let q = search.value.trim().toLowerCase();
    const count = h('span', { class: 'dB-count' });
    const rail = jbxRail(ctx, [{ id: 'all', kids: ['All songs'], solo: true }].concat(ctx.games.map(g => ({ id: g.id, kids: [ctx.art(g), g.name] }))),
      id => { filter = id; render(); }, 'Filter by game');
    const list = h('ul', { class: 'dB-list scroll', role: 'list' });
    root.append(...(own ? [h('div', { class: 'dB-top' }, [search, count])] : []), rail.el, list);
    search.oninput = () => { q = search.value.trim().toLowerCase(); render(); };

    const rowBy = {};
    function row(t) {
      const end = h('span', { class: 'dB-end' }, ctx.fmt(t.seconds));
      const b = h('button', { class: 'dB-row' + (t.locked ? ' is-locked' : ''), 'data-id': t.id }, [
        ctx.art(t),
        h('span', { class: 'dB-text' }, [
          h('div', { class: 'dB-title' }, [t.title + ' ', ...(t.variant ? [h('span', { class: 'tag' }, t.variant)] : []), ...(t.locked ? [' ', h('span', { class: 'lock' }, '🔒')] : [])]),
          h('div', { class: 'dB-meta' }, `${t.g.name} · ${t.artist}`),
        ]),
        end,
      ]);
      b.onclick = () => ctx.play(t.id);
      rowBy[t.id] = { b, end, t };
      return h('li', {}, [b]);
    }
    function render() {
      rail.set(filter);
      const hit = t => !q || (t.title + ' ' + t.g.name + ' ' + (t.variant || '')).toLowerCase().includes(q);
      const shown = tracks.filter(t => (filter === 'all' || t.game === filter) && hit(t));
      count.textContent = `${shown.length} song${shown.length === 1 ? '' : 's'}`;
      Object.keys(rowBy).forEach(k => delete rowBy[k]);
      const kids = [];
      if (!shown.length) kids.push(h('li', { class: 'dB-empty' }, 'Nothing by that name in the jukebox.'));
      else if (filter === 'all' && !q) {
        ctx.games.forEach(g => {
          const mine = shown.filter(t => t.game === g.id); if (!mine.length) return;
          kids.push(h('li', { class: 'dB-group' }, `${g.name} · ${mine.length}`), ...mine.map(row));
        });
      } else kids.push(...shown.map(row));
      list.replaceChildren(...kids);
      paint(ctx.state());
    }
    function paint(s) {
      Object.values(rowBy).forEach(({ b, end, t }) => {
        const on = t.id === s.currentId;
        b.classList.toggle('is-current', on);
        end.replaceChildren(on ? ctx.eq(s.playing) : ctx.fmt(t.seconds));
      });
    }
    render();
    /* Arriving from the records, land on the song that's on. */
    const cur = rowBy[ctx.state().currentId];
    if (cur) requestAnimationFrame(() => cur.b.scrollIntoView({ block: 'center' }));
    return { sync: paint, destroy() { rail.destroy(); if (!own) search.oninput = null; } };
  };

  // ── C · Shelf ───────────────────────────────────────────────────────────
  JBX_DESIGNS.shelf = function (root, ctx) {
    const { h } = ctx;
    let view = 'grid';
    root.classList.add('dC');
    const mins = s => Math.max(1, Math.round(s / 60));

    function grid() {
      view = 'grid';
      const g_ = h('div', { class: 'dC-grid' });
      ctx.games.forEach(g => {
        const n = g.tracks.length, eqSlot = h('span', { 'data-eq': g.id });
        const b = h('button', { class: 'dC-tile', 'aria-label': `${g.name}, ${n} songs` }, [
          ctx.art(g),
          h('span', { class: 'dC-foot' }, [h('div', {}, [h('b', {}, g.name), h('small', {}, `${n} song${n === 1 ? '' : 's'}`)]), eqSlot]),
        ]);
        b.onclick = () => album(g);
        g_.append(b);
      });
      root.replaceChildren(h('div', { class: 'scroll', style: 'flex:1' }, [g_]));
      paint(ctx.state());
    }
    const rowBy = {};
    function album(g) {
      view = g.id;
      const total = g.tracks.reduce((a, t) => a + t.seconds, 0);
      const back = h('button', { class: 'dC-back', 'aria-label': 'Back to all albums' }, '←');
      back.onclick = grid;
      const all = h('button', { class: 'dC-playall' }, 'Play all');
      all.onclick = () => { const t = g.tracks.find(t => !t.locked); if (t) ctx.play(t.id); };
      const hero = h('div', { class: 'dC-banner', style: `--b:${g.brand}` }, [back, h('div', { class: 'dC-hero' }, [
        ctx.art(g),
        h('div', { class: 'dC-hero-text' }, [
          h('div', { class: 'dC-eyebrow' }, 'Album'), h('h2', {}, g.name),
          h('p', {}, `${g.tracks.length} song${g.tracks.length === 1 ? '' : 's'} · ${mins(total)} min · ${g.tracks[0].artist}`), all,
        ]),
      ])]);
      Object.keys(rowBy).forEach(k => delete rowBy[k]);
      const ul = h('ul', { class: 'dC-tracks' });
      g.tracks.forEach((t, i) => {
        const no = h('span', { class: 'dC-no' }, String(i + 1)), end = h('span', { class: 'dB-end' }, ctx.fmt(t.seconds));
        const b = h('button', { class: 'dB-row' + (t.locked ? ' is-locked' : '') }, [no,
          h('span', { class: 'dB-text' }, [
            h('div', { class: 'dB-title' }, [t.title + ' ', ...(t.variant ? [h('span', { class: 'tag' }, t.variant)] : []), ...(t.locked ? [' 🔒'] : [])]),
            h('div', { class: 'dB-meta' }, t.artist),
          ]), end]);
        b.onclick = () => ctx.play(t.id);
        rowBy[t.id] = { b, no, end, t, i };
        ul.append(h('li', {}, [b]));
      });
      root.replaceChildren(h('div', { class: 'scroll dC-album', style: 'flex:1' }, [hero, ul]));
      paint(ctx.state());
    }
    function paint(s) {
      const cur = s.currentId && ctx.byId[s.currentId];
      if (view === 'grid') {
        root.querySelectorAll('[data-eq]').forEach(el => el.replaceChildren(...(cur && cur.game === el.dataset.eq ? [ctx.eq(s.playing)] : [])));
      } else {
        Object.values(rowBy).forEach(({ b, no, end, t, i }) => {
          const on = t.id === s.currentId;
          b.classList.toggle('is-current', on);
          no.replaceChildren(on ? ctx.eq(s.playing) : String(i + 1));
          end.textContent = ctx.fmt(t.seconds);
        });
      }
    }
    grid();
    return { sync: paint };
  };

  // ── D · Wallbox (original) ──────────────────────────────────────────────
  /* A diner wallbox, rebuilt in the cat's plastic. Each game is one paper
     title strip with a LETTER; each of its songs is a NUMBER — so a game's
     themes read as the A- and B-sides of one record, which is exactly what a
     variant track is. Tap a song to play it, or dial it: letter, number, Play.
     I and O are skipped, as on a real wallbox (they read as 1 and 0). */
  JBX_DESIGNS.wallbox = function (root, ctx) {
    const { h } = ctx;
    const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const PER = 6;
    const games = ctx.games.map((g, i) => ({ g, L: LETTERS[i] || '?' }));
    const byCode = {}, codeOf = {};
    games.forEach(({ g, L }) => g.tracks.forEach((t, j) => { byCode[L + (j + 1)] = t; codeOf[t.id] = L + (j + 1); }));
    const pages = Math.ceil(games.length / PER);
    const maxN = Math.max(...ctx.games.map(g => g.tracks.length));
    let page = 0, armL = '', armN = '', flash = null;
    const cur0 = ctx.state().currentId; if (cur0) page = pageOf(cur0);
    root.classList.add('dD');

    const code = h('span', { class: 'wb-code' }), lcdT = h('span', { class: 'wb-lcd-t' });
    const rack = h('div', { class: 'wb-rack' });
    const dots = h('div', { class: 'wb-dots', 'aria-hidden': 'true' });
    const pad = h('div', { class: 'wb-pad', role: 'group', 'aria-label': 'Dial a song' });
    const kPrev = h('button', { class: 'wb-knob', 'aria-label': 'Previous page' }, '◀');
    const kNext = h('button', { class: 'wb-knob', 'aria-label': 'Next page' }, '▶');
    kPrev.onclick = () => turn(-1); kNext.onclick = () => turn(1);
    root.append(h('div', { class: 'wb' }, [
      h('div', { class: 'wb-top' }, [h('span', { class: 'wb-ears' }, 'Dial a song'), h('div', { class: 'wb-lcd', 'aria-live': 'polite' }, [code, lcdT])]),
      h('div', { class: 'wb-mid' }, [kPrev, h('div', { class: 'wb-window' }, [rack]), kNext]),
      dots, pad,
    ]));

    function pageOf(id) { const i = games.findIndex(x => x.g.id === ctx.byId[id].game); return Math.floor(i / PER); }
    const songBy = {};
    function drawRack() {
      Object.keys(songBy).forEach(k => delete songBy[k]);
      const kids = games.slice(page * PER, page * PER + PER).map(({ g, L }) => h('div', { class: 'wb-strip', style: `--b:${g.brand};--bi:${g.ink}` }, [
        h('div', { class: 'wb-band' }, [ctx.art(g), h('span', {}, g.name), h('b', { class: 'wb-letter' }, L)]),
        h('div', { class: 'wb-songs' }, g.tracks.map((t, j) => {
          const b = h('button', { class: 'wb-song' + (t.locked ? ' is-locked' : '') }, [h('b', {}, L + (j + 1)), h('span', {}, t.title), ...(t.variant ? [h('i', { class: 'tag' }, t.variant)] : []), ...(t.locked ? ['🔒'] : [])]);
          b.onclick = () => { armL = L; armN = String(j + 1); ctx.play(t.id); paint(ctx.state()); };
          songBy[t.id] = b; return b;
        })),
      ]));
      while (kids.length < PER) kids.push(h('div', { class: 'wb-strip empty' }));
      rack.replaceChildren(...kids);
      dots.replaceChildren(...Array.from({ length: pages }, (_, i) => h('i', { class: i === page ? 'on' : '' })));
      drawPad();
      paint(ctx.state());
    }
    const keyBy = {};
    function drawPad() {
      Object.keys(keyBy).forEach(k => delete keyBy[k]);
      const key = (label, cls, fn, id) => { const b = h('button', { class: 'wb-k ' + cls }, label); b.onclick = fn; if (id) keyBy[id] = b; return b; };
      const letters = games.slice(page * PER, page * PER + PER).map(({ L }) => key(L, 'l', () => press(L), L));
      const nums = Array.from({ length: maxN }, (_, i) => key(String(i + 1), 'n', () => press(String(i + 1)), String(i + 1)));
      pad.replaceChildren(...letters, h('span', { class: 'wb-sep' }), ...nums, h('span', { class: 'wb-sep' }),
        key('Clear', 'clr', () => { armL = armN = ''; paint(ctx.state()); }), key('Play ▶', 'go', go));
    }
    function press(k) {
      if (/[0-9]/.test(k)) armN = k; else { armL = k; armN = ''; }
      paint(ctx.state());
    }
    function go() {
      const t = byCode[armL + armN];
      if (!t) { flash = armL || armN ? 'No such song' : 'Dial a letter, then a number'; paint(ctx.state()); setTimeout(() => { flash = null; paint(ctx.state()); }, 1400); return; }
      ctx.play(t.id);
    }
    function turn(d) {
      const next = (page + d + pages) % pages;
      if (ctx.reduced()) { page = next; drawRack(); return; }
      rack.classList.remove('flip-next', 'flip-prev'); void rack.offsetWidth;
      rack.classList.add(d > 0 ? 'flip-next' : 'flip-prev');
      setTimeout(() => { page = next; drawRack(); }, 120);
    }
    rack.addEventListener('animationend', () => rack.classList.remove('flip-next', 'flip-prev'));

    function paint(s) {
      const armed = byCode[armL + armN];
      Object.entries(songBy).forEach(([id, b]) => {
        b.classList.toggle('is-current', id === s.currentId);
        b.classList.toggle('is-armed', !!armed && armed.id === id && id !== s.currentId);
      });
      Object.entries(keyBy).forEach(([k, b]) => b.classList.toggle('lit', k === armL || k === armN));
      const cur = s.currentId && ctx.byId[s.currentId];
      if (flash) { code.textContent = (armL + armN) || '--'; lcdT.textContent = flash; lcdT.className = 'wb-lcd-t'; }
      else if (armL && !(cur && codeOf[cur.id] === armL + armN)) {
        code.textContent = armL + (armN || '_');
        lcdT.textContent = armed ? armed.title : armN ? 'No such song' : games.find(x => x.L === armL).g.name + ' — pick a number';
        lcdT.className = 'wb-lcd-t';
      } else if (cur) { code.textContent = codeOf[cur.id]; lcdT.textContent = (s.playing ? '♪ ' : '❚❚ ') + cur.title; lcdT.className = 'wb-lcd-t'; }
      else { code.textContent = '--'; lcdT.textContent = 'Dial a letter, then a number'; lcdT.className = 'wb-lcd-t dim'; }
    }

    /* Typing works too: a letter, a number, Enter. Only while this design is up. */
    function onKey(e) {
      if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (games.some(x => x.L === k)) { page = Math.floor(games.findIndex(x => x.L === k) / PER); drawRack(); press(k); }
      else if (/^[1-9]$/.test(k) && Number(k) <= maxN) press(k);
      else if (e.key === 'Enter') go();
      else if (e.key === 'Backspace') { armL = armN = ''; paint(ctx.state()); }
      else return;
      e.preventDefault();
    }
    document.addEventListener('keydown', onKey);

    let lastCurrent = cur0;
    drawRack();
    return {
      sync(s) {
        if (s.currentId && s.currentId !== lastCurrent) {
          lastCurrent = s.currentId;
          const c = codeOf[s.currentId]; armL = c[0]; armN = c.slice(1);
          const p = pageOf(s.currentId); if (p !== page) { page = p; drawRack(); return; }
        }
        paint(s);
      },
      destroy() { document.removeEventListener('keydown', onKey); },
    };
  };
})();
