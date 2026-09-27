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

    /* The controller prop's idle rumble (controller animation round): a rumble
       motor, not a phone buzzer — a low saw through a lowpass, in the prop's own
       two pulses (lounge-props.js LOU_CTL_RUMBLE_PULSES, 0-260 and 360-640 ms;
       kept in step by hand). One-shot: 0.68 s, and it stops itself.
       Re-tuned 27 Sep 2026 (owner): the original 58/87 Hz saw+square droned
       long enough to read as a sustained hum rather than two chattering
       pulses, and got mistaken for the phone's own notification. Higher
       oscillators (72/104 Hz), a tighter lowpass and a faster decay per pulse
       keep it a quick rattle instead of a hum. */
    function rumble(c) {
      const t = c.currentTime;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; lp.Q.value = 0.6;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
      [[0, 0.26], [0.36, 0.64]].forEach(([a, z]) => {
        g.gain.setValueAtTime(0.0001, t + a);   // an anchor, or the second attack ramps across the whole gap
        g.gain.exponentialRampToValueAtTime(0.14, t + a + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + z);
      });
      [[72, 'sawtooth'], [104, 'square']].forEach(([hz, type]) => {
        const o = c.createOscillator(); o.type = type; o.frequency.value = hz;
        o.connect(lp); o.start(t); o.stop(t + 0.68);
      });
      lp.connect(g); g.connect(master);
    }

    /* The phone's notification alert (owner, 27 Sep 2026 — replaces the
       silent buzz beat). A clean two-note chime rather than anything
       buzz-shaped, so it reads unmistakably as "a message arrived" and never
       as the controller's rumble: two bell-like sines (a soft attack, longer
       decay) a fifth apart, echoing the shape of playSuccess but shorter and
       gentler for an idle-room ambience rather than a win state. */
    function phoneAlert(c) {
      const t = c.currentTime;
      [[880, 0], [1318.5, 0.09]].forEach(([hz, at]) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = hz;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t + at);
        g.gain.exponentialRampToValueAtTime(0.22, t + at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.38);
        o.connect(g); g.connect(master); o.start(t + at); o.stop(t + at + 0.4);
      });
    }

    /* The cat jukebox's "sing" idle beat (owner, 27 Sep 2026) — a whistled tune
       under the five floating notes, rather than a silent animation. A pure
       sine with a light vibrato (a real whistle's timbre, not a synth lead),
       five short notes timed to the notes' own birth beats in lounge-props.js
       (NOTE_FROM's `born = 150 + i*430`) so the tune and the visual notes
       land together — a jaunty little up-down phrase, not a scale. */
    function jukeboxWhistle(c) {
      const t = c.currentTime;
      [[659.25, 0.15], [880, 0.58], [987.77, 1.01], [880, 1.44], [659.25, 1.87]].forEach(([hz, at]) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = hz;
        const vib = c.createOscillator(); vib.type = 'sine'; vib.frequency.value = 5.5;
        const vibG = c.createGain(); vibG.gain.value = hz * 0.012;
        vib.connect(vibG); vibG.connect(o.frequency); vib.start(t + at); vib.stop(t + at + 0.34);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t + at);
        g.gain.exponentialRampToValueAtTime(0.16, t + at + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.32);
        o.connect(g); g.connect(master); o.start(t + at); o.stop(t + at + 0.34);
      });
    }

    const VOICE = { dialPress: click, phoneOpen: flip, binderOpen: flump, controllerRumble: rumble, phoneAlert, jukeboxWhistle };
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
  const LOU_SFX_VOICES = ['dialPress', 'phoneOpen', 'binderOpen', 'controllerRumble', 'phoneAlert', 'jukeboxWhistle'];
  const api = { louCreateSfx, LOU_SFX_VOICES };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.LouSfx = api;
})();
