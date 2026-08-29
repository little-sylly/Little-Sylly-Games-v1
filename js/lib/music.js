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

  // Effective output level. Global mute wins over everything, exactly as it
  // does for effects — one switch silences the whole app.
  function targetGain() {
    return (!enabled || isMuted) ? 0 : volume;
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
  function applyGain(seconds = 0.06) {
    if (!masterGain) return;
    const ctx = getAudioCtx();
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(targetGain(), ctx.currentTime + seconds);
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

  // Two-tier resolution: the game's own track, else the fallback.
  function resolveKey(gameId) {
    if (!manifest) return null;
    if (gameId && manifest.tracks[gameId]) return gameId;
    const fb = manifest.fallback || 'lobby';
    return manifest.tracks[fb] ? fb : null;
  }

  async function loadBuffer(key) {
    if (buffers.has(key)) return buffers.get(key);
    const entry = manifest.tracks[key];
    if (!entry || !entry.file) return null;
    try {
      const res = await fetch(TRACK_DIR + encodeURIComponent(entry.file));
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
    // A newer request landed while we were decoding — drop this one.
    if (pendingKey && pendingKey !== key) return;

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
      const unlock = () => {
        if (unlocked) return;
        unlocked = true;
        try { getAudioCtx().resume(); } catch (_) {}
        const key = pendingKey || resolveKey(activeGameId);
        if (key) start(key);
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('pointerdown', unlock);
      document.addEventListener('keydown', unlock);
      // Queue the lobby theme so the very first gesture starts it.
      pendingKey = resolveKey(null);
    },

    // The single entry point every screen change funnels through. Resolving
    // to the track already playing is a no-op, so navigating around inside one
    // game never restarts its music.
    playFor(gameId) {
      if (!manifest) return;
      const key = resolveKey(gameId);
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

    isEnabled() { return enabled; },
    getVolume() { return volume; },

    setEnabled(on) {
      enabled = !!on;
      localStorage.setItem('sylly-music', String(enabled));
      applyGain(0.2);
      if (enabled) {
        // Turning music on — start whatever the current screen calls for.
        if (!current && unlocked) {
          const key = resolveKey(activeGameId);
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

    // For a credits/attribution surface later; returns null when silent.
    nowPlaying() {
      if (!current || !manifest) return null;
      const t = manifest.tracks[current.key];
      return t ? { key: current.key, title: t.title || null, artist: t.artist || null } : null;
    }
  };
})();
