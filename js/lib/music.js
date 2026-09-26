// ═══════════════════════════════════════════════════════════════════════════
// MUSIC — looping background tracks, resolved per game with a lobby fallback
//
// Depends on: engine.js (getAudioCtx, isMuted)
//
// The suite's sound EFFECTS are synthesised at runtime and always will be —
// this module is the one place that touches audio FILES. Everything it loads
// lives in data/music/ and is runtime-cached by sw.js (never precached), so a
// new track ships by dropping an mp3 in that folder and adding one manifest
// line — no sw.js edit, no CACHE_NAME bump. Same contract as data/packs/.
//
// Resolution is two-tier: a track keyed by the game's own activeGameId, else
// the fallback ('lobby'). A game with no track of its own therefore plays the
// lobby theme rather than falling silent, and a NEW game inherits that for
// free without touching this file.
//
// HOLD (the jukebox, SW v233). Everything above is background music: a looping
// buffer chosen by showScreen(). hold(track) puts ONE chosen song on instead and
// keeps it through lobby navigation — playFor(null) leaves it alone — until
// release(), or until a GAME asks for music (playFor(gameId)), which lets go and
// hands the room back to that game's theme. A held song is a whole song (1–6
// min), not a loop, so it plays through a media element rather than a decoded
// buffer (a 6-minute track decoded is ~130 MB of PCM). That element is the only
// one in the app, it lives here, and it is routed through the same AudioContext
// — with an AnalyserNode the jukebox's equaliser reads. It is fed a Blob, not a
// URL: a media element streams with Range requests, the 206 replies to which
// the Cache API refuses to store, so a streamed track would never work offline.
// ═══════════════════════════════════════════════════════════════════════════

const Music = (() => {
  const MANIFEST_URL = 'data/music/manifest.json';
  const TRACK_DIR    = 'data/music/';
  const FADE_S       = 0.6;   // crossfade between tracks, and fade on stop
  const DEFAULT_VOL  = 0.3;   // deliberately well under the effects level

  // ── Persisted state ───────────────────────────────────────────────────────
  // Music is ON by default — the app should feel finished out of the box, and
  // one tap turns it off for good. Both keys follow the isMuted/masterVolume
  // precedent: user preference, not game state, so localStorage is permitted.
  let enabled = localStorage.getItem('sylly-music') !== 'false';
  let volume  = parseFloat(localStorage.getItem('sylly-music-volume') ?? String(DEFAULT_VOL));

  // ── Runtime state ─────────────────────────────────────────────────────────
  let manifest    = null;   // parsed manifest.json; null until loaded (or if it failed)
  let masterGain  = null;   // single node every track passes through
  let current     = null;   // { key, source, gain } of the playing track
  let pendingKey  = null;   // requested before audio was unlocked — played on first gesture
  let unlocked    = false;  // has a user gesture resumed the AudioContext yet?
  const buffers   = new Map();  // trackKey -> decoded AudioBuffer

  // ── Hold state (the jukebox) ─────────────────────────────────────────────
  let held      = null;   // { key, title, artist } of the held song; null = background music rules
  let holdToken = 0;      // bumps on every hold/release, so a slow fetch cannot land late
  let deckEl    = null;   // the one media element, created on first hold (always from a tap)
  let deckGain  = null;   // its level — see deckGainValue()
  let deckScope = null;   // AnalyserNode after deckGain; the jukebox's equaliser reads it
  let deckUrl   = null;   // the current Blob URL, revoked when replaced

  // Effective output level. Global mute wins over everything, exactly as it
  // does for effects — one switch silences the whole app.
  function targetGain() {
    return (!enabled || isMuted) ? 0 : volume;
  }
  /* A held song was asked for by name, so the Music toggle (which is about
     BACKGROUND music) does not silence it. Mute All still does. */
  function deckGainValue() {
    return isMuted ? 0 : volume;
  }

  function ensureMasterGain() {
    if (masterGain) return masterGain;
    const ctx = getAudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = targetGain();
    masterGain.connect(ctx.destination);
    return masterGain;
  }

  // Ramp rather than jump — a step change in gain on a sustained tone is an
  // audible click. 60 ms is below the motion standard's smallest UI beat and
  // reads as instant.
  function rampTo(param, value, seconds) {
    const ctx = getAudioCtx();
    param.cancelScheduledValues(ctx.currentTime);
    param.setValueAtTime(param.value, ctx.currentTime);
    param.linearRampToValueAtTime(value, ctx.currentTime + seconds);
  }
  function applyGain(seconds = 0.06) {
    if (masterGain) rampTo(masterGain.gain, targetGain(), seconds);
    if (deckGain) rampTo(deckGain.gain, deckGainValue(), seconds);
    else if (deckEl) deckEl.volume = deckGainValue();
  }

  /* Built on the first hold(), which only ever runs from a tap — a context
     first touched without one starts suspended, and everything routed through
     it (the element included, once createMediaElementSource owns it) is silent.
     resume() here too, every time: a phone can suspend the context under us. */
  function ensureDeck() {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') { try { ctx.resume().catch(() => {}); } catch (_) {} }
    if (deckEl) return deckEl;
    deckEl = new Audio();
    deckEl.preload = 'auto';
    try {
      const src = ctx.createMediaElementSource(deckEl);
      deckGain = ctx.createGain();
      deckGain.gain.value = deckGainValue();
      deckScope = ctx.createAnalyser();
      deckScope.fftSize = 256;
      deckScope.smoothingTimeConstant = 0.72;
      src.connect(deckGain);
      deckGain.connect(deckScope);
      deckScope.connect(ctx.destination);
    } catch (_) {
      // No graph (an old engine): the element plays straight out, at the
      // music level, and the equaliser falls back to its random walk.
      deckGain = null; deckScope = null;
      deckEl.volume = deckGainValue();
    }
    return deckEl;
  }
  function clearDeck() {
    if (!deckEl) return;
    deckEl.pause();
    deckEl.removeAttribute('src');
    try { deckEl.load(); } catch (_) {}
    if (deckUrl) { URL.revokeObjectURL(deckUrl); deckUrl = null; }
  }

  // ── Manifest ──────────────────────────────────────────────────────────────
  // Never throws. A missing or malformed manifest means "this app has no
  // music", which is a completely valid state — it is how the suite shipped
  // for eighteen games.
  async function loadManifest() {
    if (manifest) return manifest;
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || typeof json.tracks !== 'object') return null;
      manifest = json;
      return manifest;
    } catch (_) {
      return null;   // offline on a cold install, or no music folder at all
    }
  }

  // Three-tier resolution: `<gameId>:sylly` if the caller says Sylly is on AND
  // that variant exists, else the game's own base track, else the fallback. A
  // game with no Sylly variant — or Sylly off — falls straight through to its
  // base track, so this needs zero code per game (Sylly wiring, 27 Sep 2026).
  function resolveKey(gameId, isSylly) {
    if (!manifest) return null;
    if (gameId) {
      if (isSylly && manifest.tracks[gameId + ':sylly']) return gameId + ':sylly';
      if (manifest.tracks[gameId]) return gameId;
    }
    const fb = manifest.fallback || 'lobby';
    return manifest.tracks[fb] ? fb : null;
  }

  // `isGameSyllyOn` is an engine.js global (each game's Sylly flag is private
  // plugin state, so engine.js holds the per-game lookup — same shape as
  // `getMuteToggleOnClass`). Guarded with `typeof` the same way every other
  // cross-module read in this file is, so a test harness that stubs `window`
  // without it still gets correct (non-Sylly) behaviour rather than a throw.
  function currentSylly() {
    return typeof isGameSyllyOn === 'function' ? isGameSyllyOn(activeGameId) : false;
  }

  async function loadBuffer(key) {
    if (buffers.has(key)) return buffers.get(key);
    const entry = manifest.tracks[key];
    if (!entry || !entry.file) return null;
    try {
      // encodeURIComponent on the whole path would also encode a subfolder's own
      // '/' into '%2F' (a real 404, found promoting jukebox tracks into this
      // manifest, 26 Sep 2026 — "file": "jukebox/<id>.mp3") — encode per segment
      // instead, so a subpath survives and a plain filename is unaffected.
      const encodedFile = entry.file.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(TRACK_DIR + encodedFile);
      if (!res.ok) return null;
      const bytes = await res.arrayBuffer();
      // Safari still wants the callback form; the promise form is used where
      // available and awaited identically.
      const buf = await getAudioCtx().decodeAudioData(bytes);
      buffers.set(key, buf);
      return buf;
    } catch (_) {
      return null;   // a truncated/corrupt/absent file must never break a screen
    }
  }

  // ── Playback ──────────────────────────────────────────────────────────────
  function fadeOutAndStop(node, seconds) {
    if (!node) return;
    const ctx = getAudioCtx();
    try {
      node.gain.gain.cancelScheduledValues(ctx.currentTime);
      node.gain.gain.setValueAtTime(node.gain.gain.value, ctx.currentTime);
      node.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + seconds);
      node.source.stop(ctx.currentTime + seconds + 0.05);
    } catch (_) { /* already stopped */ }
  }

  async function start(key) {
    // Nothing is started while music is off. Holding a silent looping source
    // open would decode and mix audio forever for no output — a real battery
    // cost on the phones this suite actually runs on. setEnabled(true) starts
    // whatever the current screen calls for instead.
    if (!enabled) return;
    const buf = await loadBuffer(key);
    if (!buf) return;
    // A newer request landed while we were decoding — drop this one. So did a
    // held song, if the jukebox took over mid-decode.
    if (pendingKey && pendingKey !== key) return;
    if (held) return;

    const ctx  = getAudioCtx();
    const out  = ensureMasterGain();
    const gain = ctx.createGain();
    const src  = ctx.createBufferSource();

    src.buffer = buf;
    src.loop   = true;   // gapless — this is why tracks are decoded into a
                         // buffer rather than driven through <audio loop>,
                         // which inserts an audible gap at the wrap point.
    src.connect(gain);
    gain.connect(out);

    // Per-track trim from the manifest, so one loud track can be balanced
    // against the others without re-encoding it.
    const trim = typeof manifest.tracks[key].gain === 'number'
      ? manifest.tracks[key].gain : 1;
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(trim, ctx.currentTime + FADE_S);

    src.start(0);
    if (current) fadeOutAndStop(current, FADE_S);
    current    = { key, source: src, gain };
    pendingKey = null;
  }

  // Drop the held song. The caller decides what plays next.
  function letGo() {
    holdToken++;
    held = null;
    clearDeck();
  }

  // The first-gesture unlock. Armed by init(); also run by hold(), whose tap
  // is a gesture in its own right.
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try { getAudioCtx().resume(); } catch (_) {}
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    if (held || !manifest) return;
    const key = pendingKey || resolveKey(activeGameId, currentSylly());
    if (key) start(key);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    // Called once at boot. Loads the manifest and arms the first-gesture
    // unlock — browsers will not let an AudioContext produce sound until the
    // user has interacted, so the opening track cannot start on page load. It
    // starts on the first tap anywhere, which in practice is the first tap on
    // the lobby.
    async init() {
      await loadManifest();
      if (!manifest) return;
      document.addEventListener('pointerdown', unlock);
      document.addEventListener('keydown', unlock);
      // Queue the lobby theme so the very first gesture starts it.
      pendingKey = resolveKey(null);
    },

    // The single entry point every screen change funnels through. Resolving
    // to the track already playing is a no-op, so navigating around inside one
    // game never restarts its music. `isSylly` is optional — showScreen() is
    // the one caller that passes it (via engine.js's isGameSyllyOn getter map);
    // any other caller gets the game's base track, which is always correct for
    // a game with no Sylly variant.
    playFor(gameId, isSylly) {
      // A held song owns the lobby (gameId null); a game takes the room back.
      if (held) {
        if (!gameId) return;
        letGo();
      }
      if (!manifest) return;
      const key = resolveKey(gameId, isSylly);
      if (!key) return;
      if (current && current.key === key) return;
      if (!unlocked) { pendingKey = key; return; }
      pendingKey = key;
      start(key);
    },

    stop() {
      if (current) fadeOutAndStop(current, 0.25);
      current = null;
      pendingKey = null;
    },

    // ── Hold: one chosen song, kept through lobby navigation ────────────────
    /* Call from a tap. track = { key, url, title?, artist? }. The background
       loop steps aside at once, so the tap is answered while the song
       downloads. Resolves to what happened:
         'playing'     — it is on
         'blocked'     — loaded, but the browser wants a fresh tap to start it
                         (deck().play() from that tap)
         'failed'      — could not be fetched (offline and never heard online);
                         the background music has been given back
         'superseded'  — a newer hold or a release landed first */
    async hold(track) {
      if (!track || !track.url) return 'failed';
      unlock();
      const token = ++holdToken;
      const el = ensureDeck();
      if (current) { fadeOutAndStop(current, FADE_S); current = null; }
      pendingKey = null;
      held = { key: track.key, title: track.title || null, artist: track.artist || null };
      clearDeck();
      let blob = null;
      try {
        const res = await fetch(track.url);
        if (res.ok) blob = await res.blob();
      } catch (_) { blob = null; }
      if (token !== holdToken) return 'superseded';
      if (!blob) { this.release(); return 'failed'; }
      deckUrl = URL.createObjectURL(blob);
      el.src = deckUrl;
      try { await el.play(); } catch (_) { return token === holdToken ? 'blocked' : 'superseded'; }
      return token === holdToken ? 'playing' : 'superseded';
    },

    // Let go of the held song; background music resumes for the current screen.
    release() {
      if (!held) return;
      letGo();
      this.playFor(activeGameId);
    },

    // The held song's key, playing or paused; null when background music rules.
    heldKey() { return held ? held.key : null; },

    /* The held song's media element, for its transport (play/pause/seek/time).
       null before the first hold. Wakes the AudioContext, so call it from the
       tap that wants sound. Never creates anything — hold() does that. */
    deck() {
      if (deckEl) { try { const c = getAudioCtx(); if (c.state === 'suspended') c.resume().catch(() => {}); } catch (_) {} }
      return deckEl;
    },

    // The AnalyserNode after the held song's gain — null without a graph.
    scope() { return deckScope; },

    isEnabled() { return enabled; },
    getVolume() { return volume; },

    setEnabled(on) {
      enabled = !!on;
      localStorage.setItem('sylly-music', String(enabled));
      applyGain(0.2);
      if (enabled) {
        // Turning music on — start whatever the current screen calls for.
        if (!current && unlocked && !held) {
          const key = resolveKey(activeGameId, currentSylly());
          if (key) start(key);
        }
      } else if (current) {
        // Turning music off — release the source once the fade has finished
        // rather than looping it silently forever.
        const stopping = current;
        current = null;
        setTimeout(() => fadeOutAndStop(stopping, 0.01), 220);
      }
    },

    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      localStorage.setItem('sylly-music-volume', String(volume));
      applyGain();
    },

    // Called by toggleMute() — global mute silences music along with effects.
    syncMute() { applyGain(0.2); },

    // For a credits/attribution surface later; returns null when silent. A held
    // song counts only while it is actually playing — paused is silent.
    nowPlaying() {
      if (held) return (deckEl && !deckEl.paused) ? Object.assign({}, held) : null;
      if (!current || !manifest) return null;
      const t = manifest.tracks[current.key];
      return t ? { key: current.key, title: t.title || null, artist: t.artist || null } : null;
    }
  };
})();
