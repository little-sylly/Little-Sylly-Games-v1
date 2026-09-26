// ═══════════════════════════════════════════════════════════════════════════
// jukebox.js — SANDBOX. The Jukebox room: the catalogue, one <audio> player,
// the REAL cat jukebox from the Lounge (lounge-props.js, mounted on its own
// small stage), the now-playing deck and the five transport keys. The
// selection panel is whichever design in designs.js the tabs pick.
//
// Depends on: three.min.js, controller-body.js, lobby-games.js (GAMES),
// lounge-lib.js (LouLib), lounge-props.js (LouProps), designs.js.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reducedMq.matches;
  const JB_DESIGN = { shell: '#a97fd6', plate: '#9670c8', ears: '#a97fd6', buttons: '#8f66c4' };   // CTL_DEFAULTS
  const LOBBY = { id: 'lobby', gameName: 'The Lobby', emoji: '🧸', brandHex: '#a97fd6' };
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
  function isLight(hex) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
  }
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map(s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const rainbowAt = u => { const x = u * (RAINBOW.length - 1), i = Math.min(RAINBOW.length - 2, Math.floor(x)); return mix(RAINBOW[i], RAINBOW[i + 1], x - i); };
  function seeded(str) { let s = 0; for (const c of str) s = (s * 31 + c.charCodeAt(0)) | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  async function fetchJson(url) { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch (_) { return null; } }

  let toastTimer = null;
  function toast(msg) {
    const el = $('jbx-toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
  }

  // ── The 3D cat, on its own stage ─────────────────────────────────────────
  /* The Lounge's own builder, not a copy: LOU_BUILDERS.jukebox gives the prop
     with its idle beats, its spinning carousel, its screen and five buttons.
     This stage adds only what the room would have supplied — light, an env
     map, a shadow to stand in — and makes the five buttons real. */
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
    new ResizeObserver(fit).observe(canvas); fit();

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
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, yaw0: yawTo, moved: false }; canvas.setPointerCapture(e.pointerId); });
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
      if (p.kind === 'body') { api.bop(reduced()); opts.onBody && opts.onBody(); }
      else { press(p.kind); opts.onButton(p.kind); }
    };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);

    let last = 0, playing = false;
    function frame(now) {
      requestAnimationFrame(frame);
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
    requestAnimationFrame(frame);

    return {
      setPlaying(b) { playing = !!b; api.setPlaying(playing); },
      setLabel(s) { api.setLabel(s); },
      sing() { if (!reduced()) api.startBeat('sing'); },
      press,
    };
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  async function boot() {
    const [cat, stk] = await Promise.all([fetchJson('../../data/music/jukebox/manifest.json'), fetchJson('../../data/stickers/manifest.json')]);
    if (!cat) { $('jbx-pick').textContent = 'data/music/jukebox/manifest.json did not load — serve the repo root over http.'; return; }
    const stickerOf = {};
    ((stk && stk.stickers) || []).forEach(s => { if (s.image) stickerOf[s.id] = '../../data/stickers/' + s.image; });
    const known = {}; (window.GAMES || []).concat([LOBBY]).forEach(g => { known[g.id] = g; });

    const gameBy = {}, games = [];
    const tracks = cat.tracks.map(t => {
      let g = gameBy[t.game];
      if (!g) {
        const src = known[t.game] || { id: t.game, gameName: t.game, emoji: '🎵', brandHex: '#6d549a' };
        g = gameBy[t.game] = { id: src.id, name: src.gameName, emoji: src.emoji, brand: src.brandHex, ink: isLight(src.brandHex) ? '#3b2a5c' : '#fff', art: stickerOf[src.id] || null, tracks: [] };
        games.push(g);
      }
      const tr = Object.assign({}, t, { g, baseLocked: !!t.locked });
      g.tracks.push(tr); return tr;
    });
    const byId = {}; tracks.forEach(t => { byId[t.id] = t; });
    const base = (cat.base || '../../data/music/jukebox/').split('/').map(p => (p === '..' || p === '' ? p : encodeURIComponent(p))).join('/');

    // ── artwork ──
    /* Takes a track or a game. A track shows its own cover (extracted from the
       master by tools/encode-music.js); a game, or a track with no cover,
       shows the game's sticker on its brand colour, then its emoji. */
    function art(x) {
      const g = x.g || x, cover = x.cover ? base + x.cover : null;
      const el = h('span', { class: 'jbx-art' + (cover ? ' is-cover' : ''), style: `--b:${g.brand}` });
      if (cover) el.append(h('img', { src: cover, alt: '', loading: 'lazy', draggable: 'false' }));
      else if (g.art) el.append(h('img', { src: g.art, alt: '', loading: 'lazy', draggable: 'false' }));
      else el.append(h('span', { class: 'emo', 'aria-hidden': 'true' }, g.emoji));
      return el;
    }
    const disc = x => h('span', { class: 'jbx-disc' }, [art(x)]);
    const eq = playing => h('span', { class: 'eq' + (playing ? '' : ' paused'), 'aria-label': playing ? 'Playing' : 'Paused' }, [h('i'), h('i'), h('i')]);

    // ── the player ──
    const audio = $('jbx-audio');
    const state = { currentId: null, playing: false, vol: 0.7, muted: false, fake: null };
    audio.volume = state.vol;
    const playable = () => tracks.filter(t => !t.locked);

    function play(id) {
      const t = byId[id]; if (!t) return;
      if (t.locked) { toast('🔒 That one’s still locked — keep playing to earn it.'); return; }
      if (state.currentId === id && !state.fake) { toggle(); return; }
      state.fake = null; state.currentId = id;
      ensureAnalyser();
      audio.src = base + encodeURIComponent(t.file);
      audio.play().catch(() => toast('Tap play — the browser wants a tap first.'));
      buildWave(t); stage && stage.setLabel(t.g.name); stage && stage.sing();
      update();
    }
    function toggle() {
      if (!state.currentId) { const t = playable()[0]; if (t) play(t.id); return; }
      if (state.fake) { play(state.currentId); return; }
      if (audio.paused) { ensureAnalyser(); audio.play().catch(() => {}); } else audio.pause();
    }
    function step(d) {
      const list = playable(); if (!list.length) return;
      if (d < 0 && audio.currentTime > 3 && !state.fake) { audio.currentTime = 0; return; }
      const i = list.findIndex(t => t.id === state.currentId);
      play(list[(i + d + list.length) % list.length].id);
    }
    function volume(d) {
      state.vol = Math.round(Math.max(0, Math.min(1, state.vol + d)) * 10) / 10;
      audio.volume = state.vol; paintVol();
    }
    const doKind = kind => ({ playpause: toggle, prev: () => step(-1), next: () => step(1), down: () => volume(-0.1), up: () => volume(0.1) })[kind]();
    audio.addEventListener('play', () => { state.playing = true; update(); });
    audio.addEventListener('pause', () => { state.playing = false; update(); });
    audio.addEventListener('ended', () => step(1));
    audio.addEventListener('timeupdate', paintTime);
    audio.addEventListener('loadedmetadata', paintTime);

    // ── the deck ──
    /* The waveform is two things at once: the seek bar (how far in, by colour)
       and a live equaliser (how loud, by height). Heights come from the real
       audio through an AnalyserNode; where there is no signal to read — a
       screenshot's fake "playing", a browser that refuses the graph — each bar
       random-walks instead, so it still dances. Paused, it settles back to the
       song's resting silhouette. A RAF loop, so it checks reduced motion itself
       (ui-style.md § Motion Standard): with it on, the bars hold still. */
    const wave = $('jbx-wave'), N = 64;
    let bars = [], rest = [], lvl = new Float32Array(N), walk = new Float32Array(N);
    function buildWave(t) {
      const r = seeded(t ? t.id : 'idle');
      rest = Array.from({ length: N }, (_, i) => { const u = i / (N - 1), env = 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * u), 0.6); return 0.18 + 0.82 * env * (0.35 + 0.65 * r()); });
      bars = rest.map((s, i) => { const b = h('i'); b.style.setProperty('--c', rainbowAt(i / (N - 1))); b.style.setProperty('--s', s.toFixed(3)); return b; });
      lvl = Float32Array.from(rest);
      wave.replaceChildren(...bars);
      wave.classList.toggle('idle', !t);
    }

    let actx = null, analyser = null, freq = null;
    function ensureAnalyser() {   // only ever from a tap: a context made without one starts suspended, and would mute the audio it now owns
      if (actx) { if (actx.state === 'suspended') actx.resume().catch(() => {}); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        actx = new AC();
        const src = actx.createMediaElementSource(audio);
        analyser = actx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.72;
        src.connect(analyser); analyser.connect(actx.destination);
        freq = new Uint8Array(analyser.frequencyBinCount);
      } catch (_) { analyser = null; }
    }
    let waveRaf = null, waveLast = 0, peak = 24;
    function waveTick(now) {
      waveRaf = null;
      const dt = waveLast ? Math.min((now - waveLast) / 1000, 0.05) : 0.016; waveLast = now;
      const live = state.playing && !reduced();
      let heard = false;
      if (live && analyser && !state.fake) {
        analyser.getByteFrequencyData(freq);
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
        for (let i = 0; i < N; i++) walk[i] = Math.pow(Math.min(1, walk[i] / peak), 0.85);
      }
      let moving = false;
      for (let i = 0; i < N; i++) {
        let target;
        if (!live) target = rest[i];
        else if (heard) target = 0.1 + 0.9 * walk[i] * (0.55 + 0.45 * rest[i]);
        else {   // no signal to read: a random walk, weighted by the song's silhouette
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
    function waveWake() { if (!waveRaf) waveRaf = requestAnimationFrame(waveTick); }
    function frac() {
      if (state.fake) return state.fake.frac;
      return audio.duration ? audio.currentTime / audio.duration : 0;
    }
    function paintTime() {
      const t = byId[state.currentId], f = frac(), dur = (t && t.seconds) || 0;
      $('jbx-t0').textContent = fmt(f * dur); $('jbx-t1').textContent = fmt(dur);
      const on = Math.round(f * N);
      [...wave.children].forEach((b, i) => b.classList.toggle('on', i < on));
      wave.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    }
    function seekAt(x) {
      const r = wave.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width));
      if (state.fake) { state.fake.frac = f; paintTime(); return; }
      if (audio.duration) audio.currentTime = f * audio.duration;
    }
    wave.addEventListener('pointerdown', e => { if (!state.currentId) return; wave.setPointerCapture(e.pointerId); seekAt(e.clientX); });
    wave.addEventListener('pointermove', e => { if (wave.hasPointerCapture(e.pointerId)) seekAt(e.clientX); });
    wave.addEventListener('keydown', e => {
      if (!audio.duration) return;
      if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
      else if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      else return;
      e.preventDefault();
    });
    function paintVol() { $('jbx-vol').replaceChildren(...Array.from({ length: 10 }, (_, i) => h('i', { class: i < Math.round(state.vol * 10) ? 'on' : '' }))); }

    document.querySelectorAll('.jbx-key').forEach(b => {
      b.innerHTML = ICON[b.dataset.kind === 'playpause' ? 'play' : b.dataset.kind];
      b.addEventListener('click', () => { stage && stage.press(b.dataset.kind); doKind(b.dataset.kind); });
    });
    const playKey = document.querySelector('.jbx-key.k-play');

    function update() {
      const t = byId[state.currentId];
      $('jbx-np-art').replaceChildren(t ? disc(t) : h('span', { class: 'jbx-disc' }));
      if (t && state.playing) $('jbx-np-art').firstChild.classList.add('spin');
      $('jbx-np-title').textContent = t ? t.title : 'Nothing on yet';
      $('jbx-np-meta').textContent = t ? `${t.g.name} · ${t.artist}${t.variant ? ' · ' + t.variant : ''}` : 'Pick a record — or tap the cat’s yellow button';
      playKey.innerHTML = ICON[state.playing ? 'pause' : 'play'];
      playKey.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
      stage && stage.setPlaying(state.playing);
      paintTime(); waveWake();
      design && design.sync(state);
    }

    // ── the stage ──
    const stage = jbxMountStage($('jbx-canvas'), {
      design: JB_DESIGN, games: window.GAMES || [],
      onButton(kind) {
        const k = document.querySelector(`.jbx-key[data-kind="${kind}"]`);
        if (k) { k.classList.add('pressed'); setTimeout(() => k.classList.remove('pressed'), 160); }
        doKind(kind);
      },
    });
    if (!stage) { $('jbx-canvas').hidden = true; document.querySelector('.jbx-nogl').hidden = false; }
    else stage.setLabel('Jukebox');

    // ── the selection panel ──
    const ctx = { h, tracks, games, byId, fmt, art, disc, eq, play, reduced, state: () => state };
    let design = null, designName = null;
    /* 'picked' is the owner's choice — A and B together, A first. The old
       #crate / #setlist links open it on that view; C and D stay in the lab. */
    function setDesign(name) {
      let view = null;
      if (name === 'crate' || name === 'setlist') { view = name; name = 'picked'; }
      if (!JBX_DESIGNS[name] || name === 'crate' || name === 'setlist') name = 'picked';
      if (design && design.destroy) design.destroy();
      const root = h('div', { class: 'd-root' });
      $('jbx-pick').replaceChildren(root);
      designName = name; design = JBX_DESIGNS[name](root, Object.assign({}, ctx, { initialView: view }));
      document.querySelectorAll('.jbx-lab button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.design === name)));
      try { history.replaceState(null, '', '#' + name); } catch (_) { /* file:// */ }
    }
    document.querySelectorAll('.jbx-lab button').forEach(b => { b.onclick = () => setDesign(b.dataset.design); });

    $('jbx-sound').onclick = () => { state.muted = !state.muted; audio.muted = state.muted; $('jbx-sound').textContent = state.muted ? '🔇' : '🔊'; };
    $('jbx-close').onclick = () => toast('In the app, ✕ walks you back to the Lounge.');
    $('jbx-dev-locks').onchange = e => {
      tracks.forEach(t => { t.locked = t.baseLocked || (e.target.checked && !!t.variant); });
      setDesign(designName); update();
    };

    window.addEventListener('hashchange', () => { const d = location.hash.slice(1); if (d !== designName) setDesign(d); });
    buildWave(null); paintVol(); setDesign(location.hash.slice(1) || 'picked'); update();

    /* For screenshots: put a song "on" without playing audio. */
    window.jbxDebug = {
      show(id, playing, f) { state.currentId = id; state.fake = { frac: f || 0 }; state.playing = !!playing; buildWave(byId[id]); stage && stage.setLabel(byId[id].g.name); update(); },
      setDesign, stage, audioInfo: () => ({ ctx: actx && actx.state, raf: !!waveRaf, playing: state.playing, bars: [...wave.children].slice(8, 40).filter((_, i) => i % 5 === 0).map(b => b.style.getPropertyValue('--s')).join(' '), t: audio.currentTime }),
    };
  }
  boot();
})();
