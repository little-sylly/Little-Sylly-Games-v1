// ═══════════════════════════════════════════════════════════════════════════
// jukebox.js — the Jukebox screen (SW v233), opened by tapping the cat in the
// Lounge. Ported from the signed-off sandbox (wip/jukebox-lab/, the "picked"
// design): the REAL cat jukebox mounted on its own small stage, the deck (now
// playing, the waveform that is both seek bar and live equaliser, the five
// faceplate keys), and the selection panel — Records by default, List with
// search one tap away.
//
// It plays NOTHING itself. Every song goes through Music.hold() (js/lib/music.js),
// which owns the one media element and keeps the song through lobby navigation;
// this file is the song's remote control and its view. Tracks + covers live in
// data/music/jukebox/ and are runtime-cached by sw.js — never precached.
//
// Two RAF loops (the stage, the equaliser). Both stop in jbxClose() — which
// lobby-host.js calls whenever the router closes the screen, `home` included —
// and in jbxStop(), called from resetToLobby() (logic-engine.md § Timer Lifecycle).
// The stage is built once and KEPT, like the Lounge's room: stopped, never disposed.
//
// Depends on: engine.js (isMuted), js/lib/music.js (Music), three.min.js,
// controller-body.js, lounge-lib.js (LouLib), lounge-props.js (LouProps),
// lobby-games.js (GAMES).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  const JBX_DIR = 'data/music/jukebox/';
  const JBX_TOAST_MS = 2200;
  const $ = id => document.getElementById(id);
  const reducedMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(reducedMq && reducedMq.matches);
  /* The lobby itself, as a "game" the catalogue can file songs under. */
  const JBX_LOBBY = { id: 'lobby', gameName: 'The Lobby', emoji: '🧸', brandHex: '#a97fd6' };
  const RAINBOW = ['#8a5cff', '#3fa9ff', '#33e0b0', '#c8f04a', '#ffc23d', '#ff6a86'];   // lounge-lib drawWave
  const ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.2" height="14" rx="1.3"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.3"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="3" height="14" rx="1"/><path d="M19 6.2v11.6a1 1 0 0 1-1.55.83L9.3 13.2a1.4 1.4 0 0 1 0-2.4l8.15-5.43A1 1 0 0 1 19 6.2z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="16" y="5" width="3" height="14" rx="1"/><path d="M5 6.2v11.6a1 1 0 0 0 1.55.83l8.15-5.43a1.4 1.4 0 0 0 0-2.4L6.55 5.37A1 1 0 0 0 5 6.2z"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6 12h12"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6 12h12M12 6v12"/></svg>',
  };

  // ── Small helpers ─────────────────────────────────────────────────────────
  function h(tag, attrs, kids) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    if (kids !== undefined) el.append(...[].concat(kids));
    return el;
  }
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map(s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const rainbowAt = u => { const x = u * (RAINBOW.length - 1), i = Math.min(RAINBOW.length - 2, Math.floor(x)); return mix(RAINBOW[i], RAINBOW[i + 1], x - i); };
  function seeded(str) { let s = 0; for (const c of str) s = (s * 31 + c.charCodeAt(0)) | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  let toastTimer = null;
  /* Off screen (a record started from the Lounge's carousel) the page says it
     instead — cfg.say, the Lounge's status line. */
  function toast(msg) {
    if (!isOpen) { if (cfg && cfg.say) cfg.say(msg); return; }
    const el = $('jbx-toast'); if (!el) return;
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove('on'); toastTimer = null; }, JBX_TOAST_MS);
  }

  // ── The 3D cat, on its own stage ─────────────────────────────────────────
  /* The Lounge's own builder, not a copy: LOU_BUILDERS.jukebox gives the prop
     with its idle beats, its spinning carousel, its screen and five buttons.
     This stage adds only what the room would have supplied — light, an env
     map, a shadow to stand in — and makes the five buttons real. Mounted while
     the Lounge's own RAF is stopped (the router keeps the room idle while this
     screen is up), so two scenes never render at once. */
  function jbxEnvMap(THREE, renderer) {
    const env = new THREE.Scene(); env.background = new THREE.Color('#2a2036');
    const plane = (w, hh, pos, rot, hex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); env.add(m); };
    plane(6, 3, [-3, 3, 0], [0, Math.PI / 2, 0], '#b39478');   // warm key side
    plane(4, 4, [3, 2, 0], [0, -Math.PI / 2, 0], '#6d5e8c');   // lilac rim side
    plane(8, 8, [0, -2, 0], [Math.PI / 2, 0, 0], '#2b2233');
    plane(8, 8, [0, 5, 0], [-Math.PI / 2, 0, 0], '#6a6078');
    const pmrem = new THREE.PMREMGenerator(renderer); const rt = pmrem.fromScene(env, 0.04); pmrem.dispose();
    return rt.texture;
  }

  function jbxMountStage(canvas, opts) {
    const THREE = window.THREE;
    if (!THREE || !window.LouLib || !window.LouProps || !window.ControllerBody) return null;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (_) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.environment = jbxEnvMap(THREE, renderer);
    const makeCanvas = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; };
    const lib = window.LouLib.louCreateLib(THREE, { makeCanvas, smoothNormals: window.ControllerBody.smoothNormals });
    const jb = window.LouProps.LOU_BUILDERS.jukebox({ lib, design: opts.design, games: opts.games });
    const api = jb.userData.api;
    const pivot = new THREE.Group(); pivot.add(jb); scene.add(pivot);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), new THREE.ShadowMaterial({ opacity: 0.26 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const key = new THREE.SpotLight('#ffdcb8', 2.4, 5, 0.42, 0.7, 1);
    key.position.set(-0.4, 1.7, 0.9); key.target.position.set(0, 0.15, 0);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; key.shadow.radius = 4;
    scene.add(key, key.target);
    const rim = new THREE.PointLight('#c9a8ff', 1.1, 3, 2); rim.position.set(0.55, 0.55, -0.55); scene.add(rim);
    scene.add(new THREE.HemisphereLight('#fff1e2', '#3a2a55', 0.5));
    const glow = new THREE.PointLight('#8fb4ff', 0, 0.45, 2); glow.position.set(0, 0.08, 0.22); scene.add(glow);

    const camera = new THREE.PerspectiveCamera(26, 1, 0.02, 20);
    const AZ = 0.2;                          // from a little right of centre, as the couch sees it
    function fit() {
      const w = canvas.clientWidth, hh = canvas.clientHeight; if (!w || !hh) return;
      renderer.setSize(w, hh, false); camera.aspect = w / hh;
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.max(0.215 / t, 0.2 / (t * camera.aspect));
      camera.position.set(Math.sin(AZ) * d, 0.2 + d * 0.16, Math.cos(AZ) * d);
      camera.lookAt(0, 0.17, 0); camera.updateProjectionMatrix();
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(canvas);
    fit();

    const buttons = {};
    jb.traverse(o => { if (/^button\d$/.test(o.name)) { o.userData.rest = o.position.clone(); buttons[o.userData.kind] = o; } });
    function press(kind) { const m = buttons[kind]; if (m) m.userData.pressT = performance.now(); }

    // pointer: turn it to look (it settles back), tap a button, tap the cat
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(e) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(jb, true)[0]; if (!hit) return null;
      for (let o = hit.object; o; o = o.parent) if (/^button\d$/.test(o.name)) return { kind: o.userData.kind };
      return { kind: 'body' };
    }
    let yaw = 0, yawTo = 0, drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, yaw0: yawTo, moved: false }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
    canvas.addEventListener('pointermove', e => {
      if (drag) {
        const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true;
        if (drag.moved) yawTo = Math.max(-0.8, Math.min(0.8, drag.yaw0 + dx * 0.006));
        return;
      }
      const p = pick(e); canvas.style.cursor = p ? 'pointer' : '';
    });
    const release = e => {
      if (!drag) return; const d = drag; drag = null; yawTo = 0;
      if (d.moved || e.type === 'pointercancel') return;
      const p = pick(e); if (!p) return;
      if (p.kind === 'body') api.bop(reduced());
      else { press(p.kind); opts.onButton(p.kind); }
    };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);

    let last = 0, playing = false, raf = null;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
      const red = reduced();
      yaw = red ? yawTo : yaw + (yawTo - yaw) * Math.min(1, dt * 7);
      pivot.rotation.y = yaw;
      Object.values(buttons).forEach(m => {
        const t = m.userData.pressT; if (t === undefined) return;
        const e = (now - t) / 200, depth = e < 1 ? Math.sin(Math.PI * e) * 0.0028 : 0;
        const a = m.rotation.y; m.position.set(m.userData.rest.x - Math.sin(a) * depth, m.userData.rest.y, m.userData.rest.z - Math.cos(a) * depth);
        if (e >= 1) m.userData.pressT = undefined;
      });
      glow.intensity += ((playing ? 0.35 : 0) - glow.intensity) * Math.min(1, dt * 4);
      api.tick(now, dt, red);
      renderer.render(scene, camera);
    }

    return {
      start() { if (raf === null) { last = 0; fit(); raf = requestAnimationFrame(frame); } },
      stop() { if (raf !== null) cancelAnimationFrame(raf); raf = null; last = 0; },
      isRunning: () => raf !== null,
      setPlaying(b) { playing = !!b; api.setPlaying(playing); },
      setLabel(s) { api.setLabel(s); },
      setDesign(d) { window.LouLib.louApplyDesign(jb, d); },
      sing() { if (!reduced()) api.startBeat('sing'); },
      press,
    };
  }

  // ── The rail: a row of chips, no scrollbar ───────────────────────────────
  /* Shared by Records and List. It fades an edge only where there is more to
     show, slides the chosen chip to the middle, and takes the wheel and a mouse
     drag as well as touch (there is no scrollbar to grab). */
  function jbxRail(ctx, items, onPick, label) {
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
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(edges) : null;
    if (ro) ro.observe(track);
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
    return { el: wrap, set, destroy() { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (ro) ro.disconnect(); } };
  }

  // ── The panel: Records by default, List when you're after something ──────
  /* Owner's pick (26 Sep 2026): the sandbox's A and B together. Records is the
     default — browsing — and List is one tap away for finding a particular song;
     "Find a song" goes straight there with the search focused. The search box
     outlives the switch, so what you typed is still there. */
  function jbxPanel(root, ctx) {
    root.classList.add('dP');
    const icon = d => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = d; return s; };
    const DISC = '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>';
    const LIST = '<path d="M5 7h14M5 12h14M5 17h9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';
    const FIND = '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';
    const bRec = h('button', { role: 'tab', id: 'jbx-tab-records' }, [icon(DISC), 'Records']);
    const bList = h('button', { role: 'tab', id: 'jbx-tab-list' }, [icon(LIST), 'List']);
    const seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'How to look' }, [bRec, bList]);
    const search = h('input', { class: 'dB-search', id: 'jbx-search', type: 'search', placeholder: 'Find a song or a game…', 'aria-label': 'Find a song' });
    const find = h('button', { class: 'pk-find', id: 'jbx-find', 'aria-label': 'Find a song' }, [icon(FIND), h('span', { class: 'pk-find-t' }, 'Find a song')]);
    const body = h('div', { class: 'pk-body' });
    root.append(h('div', { class: 'pk-head' }, [seg, find, search]), body);

    let inner = null;
    const views = { crate: jbxCrate, setlist: jbxSetlist };
    function show(view, focus) {
      if (inner && inner.destroy) inner.destroy();
      const r = h('div', { class: 'd-root' }); body.replaceChildren(r);
      inner = views[view](r, Object.assign({}, ctx, { search }));
      bRec.setAttribute('aria-selected', String(view === 'crate')); bList.setAttribute('aria-selected', String(view === 'setlist'));
      find.style.display = view === 'crate' ? '' : 'none';
      search.style.display = view === 'crate' ? 'none' : '';
      if (focus) search.focus();
      panel.view = view;
    }
    bRec.onclick = () => show('crate');
    bList.onclick = () => show('setlist');
    find.onclick = () => show('setlist', true);
    const panel = { view: null, show, sync: s => inner.sync(s), destroy() { if (inner && inner.destroy) inner.destroy(); } };
    show('crate');
    return panel;
  }

  // ── Records: flip through the crate ──────────────────────────────────────
  function jbxCrate(root, ctx) {
    const { tracks } = ctx;
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
    const play = h('button', { class: 'dA-play', id: 'jbx-crate-play' });
    play.onclick = () => ctx.play(tracks[focus].id);
    root.append(rail.el, flow, h('div', { class: 'dA-info' }, [idx, title, meta, play]));

    function go(i) { focus = (i + tracks.length) % tracks.length; layout(); }
    function layout() {
      recs.forEach((b, i) => {
        let o = i - focus; const n = tracks.length;
        if (o > n / 2) o -= n; if (o < -n / 2) o += n;   // the crate wraps
        const a = Math.min(Math.abs(o), 4);
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
      play.textContent = t.locked ? '🔒 Still locked' : on ? (s.loading ? 'Finding it…' : s.playing ? 'Pause' : 'Keep playing') : 'Play this one';
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
  }

  // ── List: filter, search, tap ────────────────────────────────────────────
  function jbxSetlist(root, ctx) {
    const { tracks, search } = ctx;
    let filter = 'all';
    root.classList.add('dB');
    let q = search.value.trim().toLowerCase();
    const rail = jbxRail(ctx, [{ id: 'all', kids: ['All songs'], solo: true }].concat(ctx.games.map(g => ({ id: g.id, kids: [ctx.art(g), g.name] }))),
      id => { filter = id; render(); }, 'Filter by game');
    const list = h('ul', { class: 'dB-list scroll', role: 'list' });
    root.append(rail.el, list);
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
    return { sync: paint, destroy() { rail.destroy(); search.oninput = null; } };
  }

  // ── The screen ───────────────────────────────────────────────────────────
  let cfg = null;          // jbxConfigure's options
  let cat = null;          // { tracks, games, byId } once the manifest has loaded
  let catLoading = null;   // the in-flight load, shared by every caller
  let built = false;       // the deck + panel DOM, built on the first open with a catalogue
  let isOpen = false;
  let stage = null, stageTried = false;
  let panel = null;
  let boundEl = null;      // the Music deck element our listeners are on
  const state = { currentId: null, loading: false };
  let waveRaf = null;

  /* Loaded once, shared. A failed load is forgotten so the next open retries —
     the manifest is network-first in sw.js, so "offline and never fetched" is
     the only way here, and coming back online should be enough. */
  function jbxLoad() {
    if (cat) return Promise.resolve(cat);
    if (catLoading) return catLoading;
    catLoading = fetch(JBX_DIR + 'manifest.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(man => {
      catLoading = null;
      if (!man || !Array.isArray(man.tracks) || !man.tracks.length) return null;
      const known = {}; ((cfg && cfg.games) || window.GAMES || []).concat([JBX_LOBBY]).forEach(g => { known[g.id] = g; });
      const stickerOf = {};
      const stk = (cfg && cfg.stickers) || { base: '', list: [] };
      (stk.list || []).forEach(s => { if (s.image) stickerOf[s.id] = stk.base + s.image; });
      const gameBy = {}, games = [];
      const tracks = man.tracks.map(t => {
        let g = gameBy[t.game];
        if (!g) {
          const src = known[t.game] || { id: t.game, gameName: t.game, emoji: '🎵', brandHex: '#6d549a' };
          g = gameBy[t.game] = { id: src.id, name: src.gameName, emoji: src.emoji, brand: src.brandHex, art: stickerOf[src.id] || null, tracks: [] };
          games.push(g);
        }
        const tr = Object.assign({}, t, { g, locked: !!t.locked });
        g.tracks.push(tr); return tr;
      });
      const byId = {}; tracks.forEach(t => { byId[t.id] = t; });
      cat = { tracks, games, byId };
      return cat;
    });
    return catLoading;
  }

  function el() { return boundEl; }
  function isPlaying() { const e = el(); return !!e && !e.paused && !!Music.heldKey() && Music.heldKey() === state.currentId; }
  function viewState() { return { currentId: state.currentId, playing: isPlaying(), loading: state.loading }; }
  const playable = () => cat.tracks.filter(t => !t.locked);

  /* Music.hold() made the element; listen to it once. The listeners outlive
     the screen on purpose — a song left playing still advances to the next when
     it ends, and the Lounge's cat still hears about it. */
  function bindDeck() {
    const e = Music.deck(); if (!e || e === boundEl) return;
    boundEl = e;
    e.addEventListener('play', changed);
    e.addEventListener('pause', changed);
    e.addEventListener('ended', () => { if (Music.heldKey()) step(1); });
    e.addEventListener('timeupdate', () => { if (isOpen) paintTime(); });
    e.addEventListener('loadedmetadata', () => { if (isOpen) paintTime(); });
  }
  function changed() {
    if (isOpen) update();
    if (cfg && cfg.onChange) cfg.onChange();
  }

  function artUrl(t) { return t.cover ? JBX_DIR + t.cover : null; }
  async function play(id) {
    const t = cat && cat.byId[id]; if (!t) return;
    if (t.locked) { toast('🔒 That one’s still locked — keep playing to earn it.'); return; }
    if (Music.heldKey() === id && !state.loading) { state.currentId = id; toggle(); return; }
    state.currentId = id; state.loading = true;
    if (isOpen) { buildWave(t); if (stage) { stage.setLabel(t.g.name); stage.sing(); } update(); }
    if (typeof isMuted !== 'undefined' && isMuted) toast('Everything’s muted — the 🔊 up top turns it back on.');
    const r = await Music.hold({ key: id, url: JBX_DIR + encodeURIComponent(t.file), title: t.title, artist: t.artist });
    if (r === 'superseded') return;
    state.loading = false;
    bindDeck();
    if (r === 'failed') toast('That one needs a trip online first — then it’s yours offline too.');
    else if (r === 'blocked') toast('Tap play — the browser wants a tap first.');
    changed();
  }
  function toggle() {
    if (!cat) return;
    if (!state.currentId) { const t = playable()[0]; if (t) play(t.id); return; }
    const e = Music.deck();
    if (!e || Music.heldKey() !== state.currentId) { play(state.currentId); return; }
    if (e.paused) e.play().catch(() => {}); else e.pause();
  }
  function step(d) {
    if (!cat) return;
    const list = playable(); if (!list.length) return;
    const e = el();
    if (d < 0 && e && Music.heldKey() && e.currentTime > 3) { e.currentTime = 0; return; }
    const i = list.findIndex(t => t.id === state.currentId);
    play(list[(i + d + list.length) % list.length].id);
  }
  function volume(d) {
    Music.setVolume(Math.round(Math.max(0, Math.min(1, Music.getVolume() + d)) * 10) / 10);
    paintVol();
  }
  const doKind = kind => ({ playpause: toggle, prev: () => step(-1), next: () => step(1), down: () => volume(-0.1), up: () => volume(0.1) })[kind]();

  // ── artwork ──
  /* A track shows its own cover (extracted from its master by
     tools/encode-music.js); a game, or a track with no cover, shows the game's
     sticker on its brand colour, then its emoji. */
  function art(x) {
    const g = x.g || x, cover = x.g ? artUrl(x) : null;
    const node = h('span', { class: 'jbx-art' + (cover ? ' is-cover' : ''), style: `--b:${g.brand}` });
    if (cover) node.append(h('img', { src: cover, alt: '', loading: 'lazy', draggable: 'false' }));
    else if (g.art) node.append(h('img', { src: g.art, alt: '', loading: 'lazy', draggable: 'false' }));
    else node.append(h('span', { class: 'emo', 'aria-hidden': 'true' }, g.emoji));
    return node;
  }
  const disc = x => h('span', { class: 'jbx-disc' }, [art(x)]);
  const eq = playing => h('span', { class: 'eq' + (playing ? '' : ' paused'), 'aria-label': playing ? 'Playing' : 'Paused' }, [h('i'), h('i'), h('i')]);

  // ── the deck ──
  /* The waveform is two things at once: the seek bar (how far in, by colour)
     and a live equaliser (how loud, by height). Heights come from the real
     audio through Music's AnalyserNode; with no signal to read, each bar
     random-walks instead, so it still dances. Paused, it settles back to the
     song's resting silhouette. A RAF loop, so it checks reduced motion itself
     (ui-style.md § Motion Standard): with it on, the bars hold still. */
  const N = 64;
  let bars = [], rest = [], lvl = new Float32Array(N), walk = new Float32Array(N), freq = null;
  function buildWave(t) {
    const wave = $('jbx-wave'); if (!wave) return;
    const r = seeded(t ? t.id : 'idle');
    rest = Array.from({ length: N }, (_, i) => { const u = i / (N - 1), env = 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * u), 0.6); return 0.18 + 0.82 * env * (0.35 + 0.65 * r()); });
    bars = rest.map((s, i) => { const b = h('i'); b.style.setProperty('--c', rainbowAt(i / (N - 1))); b.style.setProperty('--s', s.toFixed(3)); return b; });
    lvl = Float32Array.from(rest);
    wave.replaceChildren(...bars);
    wave.classList.toggle('idle', !t);
  }
  let waveLast = 0, peak = 24;
  function waveTick(now) {
    waveRaf = null;
    if (!isOpen || !bars.length) return;
    const dt = waveLast ? Math.min((now - waveLast) / 1000, 0.05) : 0.016; waveLast = now;
    const live = isPlaying() && !reduced();
    const scope = Music.scope();
    let heard = false;
    if (live && scope) {
      if (!freq || freq.length !== scope.frequencyBinCount) freq = new Uint8Array(scope.frequencyBinCount);
      scope.getByteFrequencyData(freq);
      /* Auto-gain: bars are scaled to a running peak that decays by half a
         second, so a quiet intro or a quiet track still fills them. */
      const top = freq.length * 0.72;
      let frameMax = 0;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1), bin = Math.floor(2 + (top - 2) * Math.pow(u, 1.5));
        walk[i] = freq[bin] * (0.8 + u * 1.1); if (walk[i] > frameMax) frameMax = walk[i];
      }
      peak = Math.max(peak * Math.pow(0.5, dt * 2), frameMax, 24);
      heard = frameMax > 3;
      if (heard) for (let i = 0; i < N; i++) walk[i] = Math.pow(Math.min(1, walk[i] / peak), 0.85);
    }
    let moving = false;
    for (let i = 0; i < N; i++) {
      let target;
      if (!live) target = rest[i];
      else if (heard) target = 0.1 + 0.9 * walk[i] * (0.55 + 0.45 * rest[i]);
      else {   // no signal to read (muted, or no graph): a random walk, weighted by the song's silhouette
        if (Math.random() < dt * 9) walk[i] = 0.2 + 0.8 * Math.random();
        target = 0.12 + 0.88 * walk[i] * rest[i];
      }
      const k = Math.min(1, dt * (target > lvl[i] ? 22 : 9));   // quick up, slower down, like a real meter
      lvl[i] += (target - lvl[i]) * k;
      if (Math.abs(target - lvl[i]) > 0.004) moving = true;
      bars[i].style.setProperty('--s', lvl[i].toFixed(3));
    }
    if (live || moving) waveRaf = requestAnimationFrame(waveTick); else waveLast = 0;
  }
  function waveWake() { if (isOpen && !waveRaf) waveRaf = requestAnimationFrame(waveTick); }
  function waveStop() { if (waveRaf !== null) cancelAnimationFrame(waveRaf); waveRaf = null; waveLast = 0; }

  function frac() {
    const e = el();
    if (!e || Music.heldKey() !== state.currentId || !e.duration) return 0;
    return e.currentTime / e.duration;
  }
  function paintTime() {
    const wave = $('jbx-wave'); if (!wave || !cat) return;
    const t = cat.byId[state.currentId], f = frac(), dur = (t && t.seconds) || 0;
    $('jbx-t0').textContent = fmt(f * dur); $('jbx-t1').textContent = fmt(dur);
    const on = Math.round(f * N);
    for (let i = 0; i < wave.children.length; i++) wave.children[i].classList.toggle('on', i < on);
    wave.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    paintVol();   // the sound overlay's music slider moves the same level
  }
  function seekAt(x) {
    const e = el(), wave = $('jbx-wave');
    if (!e || !e.duration || Music.heldKey() !== state.currentId) return;
    const r = wave.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width));
    e.currentTime = f * e.duration;
  }
  function paintVol() {
    const v = $('jbx-vol'); if (!v) return;
    const n = Math.round(Music.getVolume() * 10);
    if (v.dataset.n === String(n)) return;
    v.dataset.n = String(n);
    v.replaceChildren(...Array.from({ length: 10 }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
  }

  function update() {
    if (!built || !cat) return;
    const t = cat.byId[state.currentId], s = viewState();
    const npArt = $('jbx-np-art');
    npArt.replaceChildren(t ? disc(t) : h('span', { class: 'jbx-disc' }));
    if (t && s.playing) npArt.firstChild.classList.add('spin');
    $('jbx-np-title').textContent = t ? t.title : 'Nothing on yet';
    $('jbx-np-meta').textContent = t
      ? (s.loading ? 'Finding the record…' : `${t.g.name} · ${t.artist}${t.variant ? ' · ' + t.variant : ''}`)
      : 'Pick a record — or tap the cat’s yellow button';
    const playKey = document.querySelector('#screen-jukebox .jbx-key.k-play');
    playKey.innerHTML = ICON[s.playing ? 'pause' : 'play'];
    playKey.setAttribute('aria-label', s.playing ? 'Pause' : 'Play');
    if (stage) stage.setPlaying(s.playing);
    paintTime(); waveWake();
    if (panel) panel.sync(s);
  }

  function jbxBuild() {
    const wave = $('jbx-wave');
    wave.addEventListener('pointerdown', e => { if (!state.currentId) return; try { wave.setPointerCapture(e.pointerId); } catch (_) {} seekAt(e.clientX); });
    wave.addEventListener('pointermove', e => { if (wave.hasPointerCapture && wave.hasPointerCapture(e.pointerId)) seekAt(e.clientX); });
    wave.addEventListener('keydown', e => {
      const d = el(); if (!d || !d.duration || Music.heldKey() !== state.currentId) return;
      if (e.key === 'ArrowLeft') d.currentTime = Math.max(0, d.currentTime - 5);
      else if (e.key === 'ArrowRight') d.currentTime = Math.min(d.duration, d.currentTime + 5);
      else return;
      e.preventDefault();
    });
    document.querySelectorAll('#screen-jukebox .jbx-key').forEach(b => {
      b.innerHTML = ICON[b.dataset.kind === 'playpause' ? 'play' : b.dataset.kind];
      b.addEventListener('click', () => { if (stage) stage.press(b.dataset.kind); doKind(b.dataset.kind); });
    });
    const ctx = { h, tracks: cat.tracks, games: cat.games, byId: cat.byId, fmt, art, disc, eq, play, reduced, state: viewState };
    const root = h('div', { class: 'd-root' });
    $('jbx-pick').replaceChildren(root);
    panel = jbxPanel(root, ctx);
    built = true;
  }

  function jbxEnsureStage() {
    if (stageTried) return;
    stageTried = true;
    stage = jbxMountStage($('jbx-canvas'), {
      design: (cfg && cfg.design && cfg.design()) || { shell: '#a97fd6', plate: '#9670c8', ears: '#a97fd6', buttons: '#8f66c4' },
      games: (cfg && cfg.games) || window.GAMES || [],
      onButton(kind) {
        const k = document.querySelector(`#screen-jukebox .jbx-key[data-kind="${kind}"]`);
        if (k) { k.classList.add('pressed'); setTimeout(() => k.classList.remove('pressed'), 160); }
        doKind(kind);
      },
    });
    if (!stage) { $('jbx-canvas').hidden = true; $('jbx-nogl').hidden = false; }
    else stage.setLabel('Jukebox');
  }

  // ── Public ───────────────────────────────────────────────────────────────
  /* cfg: { games, stickers: { base, list }, design: () => colours, onClose, onChange }.
     onClose is the ✕ — the page routes it (lobby-host.js: the router's
     jukeboxClose), because only js/lobby/ may bring a layout back. onChange
     fires whenever what is playing changes, screen up or not. */
  function jbxConfigure(o) {
    cfg = o || {};
    const close = $('jbx-close');
    if (close && !close.dataset.bound) { close.dataset.bound = '1'; close.addEventListener('click', () => { if (cfg.onClose) cfg.onClose(); }); }
  }

  /* Called once the jukebox screen is on show. The catalogue may still be on
     its way; the frame is up either way, and the panel says so. */
  async function jbxOpen() {
    isOpen = true;
    jbxEnsureStage();
    if (stage) { if (cfg && cfg.design) stage.setDesign(cfg.design()); stage.start(); }
    if (!cat) $('jbx-pick').replaceChildren(h('p', { class: 'jbx-pick-msg' }, 'Finding the records…'));
    const c = await jbxLoad();
    if (!isOpen) return;
    if (!c) { $('jbx-pick').replaceChildren(h('p', { class: 'jbx-pick-msg' }, 'The records could not load — the jukebox needs one trip online first.')); return; }
    if (!built) jbxBuild();
    bindDeck();
    if (Music.heldKey() && c.byId[Music.heldKey()]) state.currentId = Music.heldKey();
    buildWave(cat.byId[state.currentId] || null);
    if (stage) { const t = cat.byId[state.currentId]; stage.setLabel(t ? t.g.name : 'Jukebox'); }
    paintVol(); update();
  }

  /* The router closed the screen. Stop both loops. A song left PLAYING keeps
     playing — that's the point of a jukebox — but one left paused (or a screen
     closed with nothing on) hands the room back to the house music. */
  function jbxClose() {
    if (!isOpen) return;
    jbxStop();
    if (Music.heldKey() && !state.loading && !isPlaying()) Music.release();
    if (cfg && cfg.onChange) cfg.onChange();
  }
  // Both RAF loops off, nothing else. resetToLobby() calls this.
  function jbxStop() {
    isOpen = false;
    if (stage) stage.stop();
    waveStop();
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; const t = $('jbx-toast'); if (t) t.classList.remove('on'); }
  }

  /* The Lounge's record carousel: "next record". With a song held it steps to
     the next; with nothing on it puts the next one after the last on, straight
     from the room — the screen is not needed to hear the cat sing. */
  async function jbxNextRecord() {
    const c = await jbxLoad(); if (!c) return;
    step(1);
  }

  window.Jukebox = {
    jbxConfigure, jbxOpen, jbxClose, jbxStop, jbxNextRecord,
    isOpen: () => isOpen,
    /* For the harness: what the screen believes, without touching Music. */
    debug: () => ({ open: isOpen, stage: !!stage, stageRunning: !!(stage && stage.isRunning()), waveRaf: waveRaf !== null,
      currentId: state.currentId, playing: isPlaying(), loading: state.loading, tracks: cat ? cat.tracks.length : 0 }),
  };
})();
