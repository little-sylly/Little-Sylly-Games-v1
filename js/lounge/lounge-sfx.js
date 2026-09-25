// ═══════════════════════════════════════════════════════════════════════════
// lounge-sfx.js — the lounge's synthesised effects, for the sandbox pages.
//
// `lounge-scene.js` never makes a sound. It NAMES moments and calls the optional
// host effect `sfx(name)`; this module is what the two sandbox pages hand it.
// That split is the point: the scene stays pure and Node-drivable, and a host
// with no audio (or a browser that has not had a gesture yet) is simply silent.
//
// Every voice is SYNTHESISED — Web Audio, no files, no bytes in the install.
// That is the suite's standing rule (CLAUDE.md § Tech Stack), and a moulded-
// plastic click is cheaper to generate than to store.
//
// NO SUSTAINED VOICES. A low hum for the length of a spin was built and cut
// (owner, 23 Sep): the room is quiet, and a motor drone under it was the one
// thing that read as a machine rather than a lounge. Worth keeping in mind if a
// later prop wants one — a sustained source also brings a lifecycle with it
// (logic-engine.md § Timer Lifecycle applies to an oscillator), where a one-shot
// stops itself and needs none.
//
// The AudioContext is created LAZILY on the first play, because browsers refuse
// audio before a user gesture and a context made at load time sits suspended
// for the whole session.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  function louCreateSfx(opts) {
    const o = opts || {};
    let ctx = null, master = null, noise = null;
    const level = o.volume === undefined ? 0.5 : o.volume;

    function audio() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = level; master.connect(ctx.destination);
      return ctx;
    }
    /* One second of white noise, made once and re-used — a fresh buffer per
       click allocates 44 k samples for a 50 ms sound. */
    function noiseBuffer(c) {
      if (noise) return noise;
      noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return noise;
    }

    /* The click. A bandpassed noise thock for the plastic, plus a short low
       blip for the travel — the same two-part shape js/controller.js uses for
       its face buttons, tuned down because this is one big button, not a pad. */
    function click(c) {
      const t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = noiseBuffer(c);
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1250; f.Q.value = 1.0;
      const g = c.createGain();
      g.gain.setValueAtTime(0.34, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.09);
      const osc = c.createOscillator(); osc.type = 'triangle';
      const og = c.createGain();
      osc.frequency.setValueAtTime(260, t); osc.frequency.exponentialRampToValueAtTime(150, t + 0.11);
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.11, t + 0.006);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(og); og.connect(master); osc.start(t); osc.stop(t + 0.15);
    }

    /* The flip phone's clack (prop round 4): the lid snapping open is two
       sounds close together — the hinge letting go, bright and dry, then the
       detent catching, lower and fuller — so it is two noise ticks 55 ms apart
       over a short low knock. One-shot, like the click. */
    function flip(c) {
      const t = c.currentTime;
      [[0, 2600, 1.6, 0.22, 0.03], [0.055, 1500, 1.1, 0.30, 0.06]].forEach(([at, hz, q, peak, len]) => {
        const s = c.createBufferSource(); s.buffer = noiseBuffer(c);
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q;
        const g = c.createGain();
        g.gain.setValueAtTime(peak, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + at + len);
        s.connect(f); f.connect(g); g.connect(master); s.start(t + at); s.stop(t + at + len + 0.02);
      });
      const osc = c.createOscillator(); osc.type = 'triangle';
      const og = c.createGain();
      osc.frequency.setValueAtTime(190, t + 0.055); osc.frequency.exponentialRampToValueAtTime(110, t + 0.13);
      og.gain.setValueAtTime(0.0001, t + 0.055); og.gain.exponentialRampToValueAtTime(0.09, t + 0.062);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(og); og.connect(master); osc.start(t + 0.05); osc.stop(t + 0.17);
    }

    /* The binder's cover landing (the stickerbook prototype): a padded cover
       falling open is soft, not a clack — a low-passed noise thump with a
       little body under it, then a quick bright rustle as the sleeve pages
       settle. One-shot, like the others. */
    function flump(c) {
      const t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = noiseBuffer(c);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + 0.16);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.22);
      const osc = c.createOscillator(); osc.type = 'sine'; const og = c.createGain();
      osc.frequency.setValueAtTime(120, t); osc.frequency.exponentialRampToValueAtTime(70, t + 0.14);
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.10, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(og); og.connect(master); osc.start(t); osc.stop(t + 0.18);
      const r = c.createBufferSource(); r.buffer = noiseBuffer(c);
      const rf = c.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 3200;
      const rg = c.createGain(); rg.gain.setValueAtTime(0.0001, t + 0.07); rg.gain.exponentialRampToValueAtTime(0.06, t + 0.09); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      r.connect(rf); rf.connect(rg); rg.connect(master); r.start(t + 0.07); r.stop(t + 0.22);
    }

    const VOICE = { dialPress: click, phoneOpen: flip, binderOpen: flump };
    return {
      /* Total by design: an unknown name, a blocked context or a suspended one
         are all "no sound", never a throw — lounge-scene.js guards this call too,
         but a door must not depend on that. */
      play(name) {
        const v = VOICE[name]; if (!v) return;
        const c = audio(); if (!c) return;
        if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (_) {} }
        try { v(c); } catch (_) {}
      },
      setVolume(v) { if (master) master.gain.value = v; },
      dispose() {
        if (!ctx) return;
        try { ctx.close(); } catch (_) {}
        ctx = null; master = null; noise = null;
      },
    };
  }

  /* The names the room may say, as data, so a harness can check a door's sound
     exists without an AudioContext. Kept in step with VOICE by hand. */
  const LOU_SFX_VOICES = ['dialPress', 'phoneOpen', 'binderOpen'];
  const api = { louCreateSfx, LOU_SFX_VOICES };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.LouSfx = api;
})();
