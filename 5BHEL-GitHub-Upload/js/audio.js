/* 5BHEL VOR GERICHT – AudioManager.
 * Originale Musik und Effekte, in Echtzeit mit der Web Audio API synthetisiert (keine Audiodateien, keine
 * externen Quellen). Läuft nur auf der Spielleitungs-/Beamer-Seite; Schüler- und Lehrkraftseite laden diese Datei nicht.
 * Start erst nach einer bewussten Benutzerinteraktion (Autoplay-Regeln der Browser). */
(function () {
  'use strict';
  var STORE = '5bhel-audio';
  var AC = window.AudioContext || window.webkitAudioContext;
  var settings = { music: true, sfx: true, musicVol: 0.6, sfxVol: 0.8, muted: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch (e) {} }

  var ctx = null, master, comp, musicBus, duckBus, sfxBus, noiseBuf, lfo;
  var unlocked = false, current = null, tracks = [], schedHandle = null;
  var log = [];               // Protokoll für Tests: abgespielte Effekte/Tracks
  var MUSIC_BASE = 0.42, SFX_BASE = 0.9;

  // ---------- Grundgerüst ----------
  function init() {
    if (ctx || !AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();  // verhindert unangenehme Lautstärkespitzen
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    master = ctx.createGain();
    musicBus = ctx.createGain(); duckBus = ctx.createGain(); sfxBus = ctx.createGain();
    musicBus.connect(duckBus); duckBus.connect(master); sfxBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    var len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; lfo.start();
    applyLevels(true);
    schedHandle = setInterval(schedule, 25);
  }
  function applyLevels(instant) {
    if (!ctx) return;
    var t = ctx.currentTime, tc = instant ? 0.001 : 0.12;
    master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, tc);
    musicBus.gain.setTargetAtTime(settings.music ? MUSIC_BASE * settings.musicVol : 0, t, tc);
    sfxBus.gain.setTargetAtTime(settings.sfx ? SFX_BASE * settings.sfxVol : 0, t, tc);
  }
  function unlock() {
    if (unlocked) return;
    init();
    if (!ctx) return;
    var p = ctx.resume && ctx.resume();
    unlocked = true;
    log.push({ t: Date.now(), type: 'unlock' });
    (p && p.then ? p : Promise.resolve()).then(function () { refresh(); renderUi(); });
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true }); });

  // ---------- Instrumente ----------
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  function env(g, t, a, peak, dec, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0002), t + a + dec);
    g.gain.setValueAtTime(Math.max(peak * sus, 0.0002), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  }
  function osc(type, f, t, stop, out, detune) {
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;
    o.connect(out); o.start(t); o.stop(stop);
    return o;
  }
  function pan(out, p) { if (!ctx.createStereoPanner) return out; var s = ctx.createStereoPanner(); s.pan.value = p; s.connect(out); return s; }

  var I = {
    piano: function (out, t, m, dur, vel) {
      var f = mtof(m), len = Math.min(3.5, 0.7 + dur * 1.6 + (72 - m) * 0.02);
      var g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800 + vel * 4200, t); lp.frequency.exponentialRampToValueAtTime(900, t + len);
      g.connect(lp); lp.connect(pan(out, Math.max(-0.5, Math.min(0.5, (m - 64) / 40))));
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * vel, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc('triangle', f, t, t + len, g); var h = ctx.createGain(); h.gain.value = 0.35; h.connect(g); osc('sine', f * 2, t, t + len, h, 3);
      var h3 = ctx.createGain(); h3.gain.value = 0.1; h3.connect(g); osc('sine', f * 3, t, t + len * 0.5, h3, -4);
    },
    strings: function (out, t, m, dur, vel) {
      var f = mtof(m), end = t + dur, g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1300 + vel * 900; lp.Q.value = 0.6;
      g.connect(lp); lp.connect(out);
      env(g, t, Math.min(0.45, dur * 0.4), 0.11 * vel, 0.3, 0.85, 0.7, end);
      [-8, 8].forEach(function (dt) {
        var o = osc('sawtooth', f, t, end + 0.8, g, dt);
        var depth = ctx.createGain(); depth.gain.value = 4; lfo.connect(depth); depth.connect(o.detune);
        o.onended = function () { lfo.disconnect(depth); depth.disconnect(); }; // Vibrato-Verbindung wieder lösen
      });
    },
    bass: function (out, t, m, dur, vel) {
      var f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 520; g.connect(lp); lp.connect(out);
      env(g, t, 0.008, 0.42 * vel, 0.18, 0.55, 0.12, t + dur);
      osc('triangle', f, t, t + dur + 0.2, g); osc('sine', f / 2, t, t + dur + 0.2, g);
    },
    pulse: function (out, t, m, dur, vel) {
      var f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 5; lp.frequency.setValueAtTime(380 + 1500 * vel, t); lp.frequency.exponentialRampToValueAtTime(160, t + dur);
      g.connect(lp); lp.connect(out);
      env(g, t, 0.005, 0.3 * vel, dur * 0.6, 0.3, 0.05, t + dur);
      osc('sawtooth', f, t, t + dur + 0.1, g); osc('square', f / 2, t, t + dur + 0.1, g);
    },
    brass: function (out, t, m, dur, vel) {
      var f = mtof(m), end = t + dur, g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 1.5;
      lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(1600 + 1800 * vel, t + 0.08); lp.frequency.exponentialRampToValueAtTime(1100, end + 0.3);
      g.connect(lp); lp.connect(out);
      env(g, t, 0.04, 0.14 * vel, 0.2, 0.75, 0.35, end);
      osc('sawtooth', f, t, end + 0.5, g, -6); osc('sawtooth', f, t, end + 0.5, g, 6);
    },
    bell: function (out, t, m, vel) {
      var f = mtof(m), g = ctx.createGain(); g.connect(out);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      osc('sine', f, t, t + 1.7, g); var h = ctx.createGain(); h.gain.value = 0.3; h.connect(g); osc('sine', f * 2.76, t, t + 0.8, h);
    },
    noise: function (out, t, dur, vel, type, freq, q) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf;
      var fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = freq; if (q) fl.Q.value = q;
      var g = ctx.createGain(); s.connect(fl); fl.connect(g); g.connect(out);
      g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
      return g;
    },
    kick: function (out, t, vel) {
      var g = ctx.createGain(); g.connect(out);
      g.gain.setValueAtTime(0.9 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      var o = osc('sine', 140, t, t + 0.35, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    },
    snare: function (out, t, vel) { I.noise(out, t, 0.16, 0.42 * vel, 'highpass', 1400); var g = ctx.createGain(); g.connect(out); g.gain.setValueAtTime(0.25 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); osc('triangle', 190, t, t + 0.1, g); },
    hat: function (out, t, vel, open) { I.noise(out, t, open ? 0.22 : 0.045, 0.16 * vel, 'highpass', 7200); },
    timpani: function (out, t, m, vel) {
      var g = ctx.createGain(); g.connect(out);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.75 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      var o = osc('sine', mtof(m) * 1.04, t, t + 1.9, g); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.25);
      I.noise(out, t, 0.25, 0.25 * vel, 'lowpass', 260);
    },
    wood: function (out, t, vel, pitch) {
      I.noise(out, t, 0.06, 0.6 * vel, 'bandpass', pitch || 1100, 6);
      var g = ctx.createGain(); g.connect(out); g.gain.setValueAtTime(0.55 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      var o = osc('sine', (pitch || 1100) / 7, t, t + 0.14, g); o.frequency.exponentialRampToValueAtTime(70, t + 0.1);
    },
    swell: function (out, t, dur, vel, down) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      var fl = ctx.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 4500;
      var g = ctx.createGain(); s.connect(fl); fl.connect(g); g.connect(out);
      if (down) { g.gain.setValueAtTime(0.22 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
      else { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2 * vel, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25); }
      s.start(t); s.stop(t + dur + 0.3);
    }
  };

  // ---------- Kompositionen (original) ----------
  // Akkorde als MIDI-Noten (Grundton, Terz, Quinte)
  var CH = {
    Dm: [50, 53, 57], Bb: [46, 50, 53], Gm: [43, 46, 50], A: [45, 49, 52], F: [41, 45, 48], C: [48, 52, 55], G: [43, 47, 50],
    Am: [45, 48, 52], E: [40, 44, 47], Dm2: [38, 41, 45], Em: [40, 43, 47], Bdim: [47, 50, 53], GB: [47, 50, 55]
  };
  function arp(c) { return [c[0], c[2], c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 12, c[0] + 12, c[2]]; }
  function mel(list) { var m = {}; list.forEach(function (n) { (m[n[0] * 16 + n[1]] = m[n[0] * 16 + n[1]] || []).push(n); }); return m; }

  var TRACKS = {
    // A. Hauptmenü – Courtroom Prelude: Klavier und Streicher, ruhig und erwartungsvoll (d-Moll)
    prelude: {
      bpm: 70, bars: 8, level: 1, chords: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'F', 'Gm', 'A'],
      mel: mel([[0, 0, 69, 6], [0, 6, 70, 2], [0, 8, 69, 4], [0, 12, 65, 4], [1, 0, 62, 8], [1, 8, 65, 4], [1, 12, 70, 4],
        [2, 0, 67, 6], [2, 6, 69, 2], [2, 8, 70, 4], [2, 12, 72, 4], [3, 0, 73, 8], [3, 8, 76, 8],
        [4, 0, 74, 6], [4, 6, 72, 2], [4, 8, 69, 4], [4, 12, 65, 4], [5, 0, 72, 8], [5, 8, 69, 4], [5, 12, 65, 4],
        [6, 0, 67, 4], [6, 4, 70, 4], [6, 8, 74, 4], [6, 12, 72, 4], [7, 0, 69, 12], [7, 12, 64, 4]]),
      step: function (o, t, s, bar, pos, loop, sp) {
        var c = CH[this.chords[bar]];
        if (pos === 0) { c.forEach(function (n) { I.strings(o, t, n + 12, sp * 16, 0.55); }); I.bass(o, t, c[0] - 12, sp * 14, 0.6); }
        if (pos % 2 === 0) I.piano(o, t, arp(c)[pos / 2], sp * 2, 0.32);
        if (loop % 2 === 1) (this.mel[bar * 16 + pos] || []).forEach(function (n) { I.piano(o, t, n[2] + 12, sp * n[3], 0.5); });
      }
    },
    // B. Gerichtsverhandlung – Trial Begins: rhythmisch, konzentriert, leichte Percussion (a-Moll)
    trial: {
      bpm: 112, bars: 8, level: 0.7, chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'Dm2', 'E'],
      mel: mel([[4, 0, 76, 4], [4, 4, 74, 2], [4, 6, 72, 2], [4, 8, 71, 4], [4, 12, 69, 4], [5, 0, 72, 4], [5, 4, 71, 2], [5, 6, 69, 2], [5, 8, 68, 8],
        [6, 0, 77, 4], [6, 4, 76, 2], [6, 6, 74, 2], [6, 8, 69, 8], [7, 0, 68, 4], [7, 4, 71, 4], [7, 8, 76, 8]]),
      step: function (o, t, s, bar, pos, loop, sp) {
        var c = CH[this.chords[bar]];
        if (pos === 0) c.forEach(function (n) { I.strings(o, t, n + 12, sp * 16, 0.4); });
        if ([0, 3, 6, 8, 11, 14].indexOf(pos) >= 0) I.bass(o, t, (pos === 14 ? c[2] : c[0]) - 12, sp * 1.6, pos === 0 ? 0.8 : 0.6);
        var osti = { 0: c[0] + 12, 2: c[2] + 12, 3: c[0] + 24, 6: c[1] + 24, 8: c[0] + 12, 10: c[2] + 12, 11: c[0] + 24, 14: c[2] + 24 };
        if (osti[pos] !== undefined) I.piano(o, t, osti[pos], sp * 0.8, pos % 8 === 0 ? 0.36 : 0.26);
        if (pos % 4 === 2) I.hat(o, t, 0.7);
        if (pos === 0 || pos === 8) I.kick(o, t, 0.45);
        if (loop % 2 === 1) (this.mel[bar * 16 + pos] || []).forEach(function (n) { I.strings(o, t, n[2], sp * n[3], 0.75); I.piano(o, t, n[2] + 12, sp * n[3], 0.3); });
      }
    },
    // C. Abstimmung – Critical Decision: schneller, pulsierender Bass, steigende Intensität (a-Moll)
    vote: {
      bpm: 136, bars: 4, level: 0.36, chords: ['Am', 'F', 'Dm2', 'E'],
      step: function (o, t, s, bar, pos, loop, sp, tr) {
        var c = CH[this.chords[bar]], k = tr.intensity || 0;
        I.pulse(o, t, c[0] - 12, sp * 0.9, pos % 4 === 0 ? 0.9 : 0.5);
        if (pos % 4 === 0) I.kick(o, t, 0.7 + k * 0.1);
        if (k >= 1 && (pos === 4 || pos === 12)) I.snare(o, t, 0.6);
        if (k >= 2 && pos % 2 === 1) I.snare(o, t, 0.15);
        I.hat(o, t, pos % 2 ? 0.35 : 0.6);
        if (pos === 0) c.forEach(function (n) { I.strings(o, t, n + 12, sp * 16, 0.45 + k * 0.2); });
        if (pos === 0 || pos === 3 || pos === 6) c.forEach(function (n) { I.piano(o, t, n + 24, sp, 0.22); });
        if (pos % 2 === 0) I.piano(o, t, (pos % 4 === 0 ? c[0] : c[1]) + 36 - (k < 2 ? 12 : 0), sp * 0.6, 0.2 + k * 0.08);
        if (bar === 3 && pos === 8) I.swell(o, t, sp * 8, 0.6 + k * 0.3);
      }
    },
    // G. Finale – Final Judgment (feierlich, C-Dur) …
    finaleHigh: {
      bpm: 84, bars: 8, level: 0.75, chords: ['C', 'GB', 'Am', 'F', 'C', 'G', 'F', 'G'],
      mel: mel([[0, 0, 76, 8], [0, 8, 79, 4], [0, 12, 76, 4], [1, 0, 74, 8], [1, 8, 71, 4], [1, 12, 74, 4], [2, 0, 72, 8], [2, 8, 76, 4], [2, 12, 81, 4],
        [3, 0, 77, 12], [3, 12, 81, 4], [4, 0, 79, 8], [4, 8, 76, 4], [4, 12, 72, 4], [5, 0, 74, 8], [5, 8, 79, 8], [6, 0, 81, 4], [6, 4, 79, 4], [6, 8, 77, 4], [6, 12, 74, 4], [7, 0, 72, 8], [7, 8, 74, 8]]),
      step: function (o, t, s, bar, pos, loop, sp) {
        var c = CH[this.chords[bar]];
        if (pos === 0) { c.forEach(function (n) { I.strings(o, t, n + 12, sp * 16, 0.6); I.brass(o, t, n, sp * 15, 0.35); }); I.timpani(o, t, c[0] - 12, 0.6); I.bass(o, t, c[0] - 12, sp * 15, 0.7); }
        if (pos === 8) I.timpani(o, t, c[0] - 12, 0.35);
        if (pos % 2 === 0) I.piano(o, t, arp(c)[pos / 2] + 12, sp * 2, 0.25);
        (this.mel[bar * 16 + pos] || []).forEach(function (n) { I.brass(o, t, n[2], sp * n[3] * 0.95, 0.75); I.strings(o, t, n[2] + 12, sp * n[3], 0.5); });
      }
    },
    // … bzw. ernst und nachdenklich bei schwächerem Ergebnis (a-Moll, gleiche Melodie in Moll)
    finaleLow: {
      bpm: 66, bars: 8, level: 0.95, chords: ['Am', 'Em', 'F', 'Dm2', 'Am', 'E', 'F', 'E'],
      step: function (o, t, s, bar, pos, loop, sp) {
        var c = CH[this.chords[bar]];
        if (pos === 0) { c.forEach(function (n) { I.strings(o, t, n + 12, sp * 16, 0.5); }); I.bass(o, t, c[0] - 12, sp * 15, 0.6); if (bar % 4 === 0) I.timpani(o, t, c[0] - 12, 0.4); }
        if (pos % 4 === 0) I.piano(o, t, arp(c)[pos / 2] + 12, sp * 3, 0.24);
        (TRACKS.finaleHigh.mel[bar * 16 + pos] || []).forEach(function (n) { I.piano(o, t, toMinor(n[2]), sp * n[3], 0.42); });
      }
    }
  };
  function toMinor(m) { var x = m - 3, pc = ((x % 12) + 12) % 12; return (pc === 1 || pc === 6) ? x - 1 : x; }

  // ---------- Sequencer mit Crossfade ----------
  function play(name, opts) {
    if (!ctx || !unlocked) { current = name; return; }
    var cur = tracks.filter(function (x) { return !x.stopAt; })[0];
    if (cur && cur.name === name) return;          // nie doppelt abspielen
    var t = ctx.currentTime, fade = (opts && opts.fade) || 1.2;
    if (cur) { cur.stopAt = t + fade + 0.1; cur.gain.gain.cancelScheduledValues(t); cur.gain.gain.setValueAtTime(cur.gain.gain.value, t); cur.gain.gain.linearRampToValueAtTime(0, t + fade); }
    current = name;
    if (!name) return;
    var def = TRACKS[name];
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(def.level || 1, t + Math.min(fade, 1.5)); g.connect(musicBus);
    tracks.push({ name: name, def: def, gain: g, step: 0, next: t + 0.08, stopAt: 0, intensity: 0 });
    log.push({ t: Date.now(), type: 'music', name: name });
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    var ahead = ctx.currentTime + 0.14;
    tracks = tracks.filter(function (tr) {
      if (tr.stopAt && ctx.currentTime > tr.stopAt) { tr.gain.disconnect(); return false; }
      var sp = 60 / tr.def.bpm / 4;
      while (tr.next < ahead && (!tr.stopAt || tr.next < tr.stopAt)) {
        var total = tr.def.bars * 16, s = tr.step % total;
        try { tr.def.step(tr.gain, tr.next, tr.step, Math.floor(s / 16), s % 16, Math.floor(tr.step / total), sp, tr); } catch (e) {}
        tr.step++; tr.next += sp;
      }
      return true;
    });
  }
  function setIntensity(k) { tracks.forEach(function (tr) { if (tr.name === 'vote' && !tr.stopAt) tr.intensity = k; }); }
  var ducked = false;
  function duck(on) {
    if (!ctx || on === ducked) return;
    ducked = on;
    duckBus.gain.setTargetAtTime(on ? 0.5 : 1, ctx.currentTime, 0.18); // Musik leiser, solange die Richterin spricht
  }

  // ---------- Effekte ----------
  var lastSfx = {};
  function sfx(name) {
    if (!ctx || !unlocked) return;
    var now = performance.now();
    if (lastSfx[name] && now - lastSfx[name] < 120) return; // keine Stapelung identischer Effekte
    lastSfx[name] = now;
    log.push({ t: Date.now(), type: 'sfx', name: name });
    var o = sfxBus, t = ctx.currentTime + 0.02;
    var S = {
      gavel: function () { I.wood(o, t, 1, 900); I.wood(o, t + 0.16, 0.8, 850); },
      trialStart: function () { I.wood(o, t, 1, 900); I.wood(o, t + 0.18, 0.9, 860); I.swell(o, t + 0.2, 1.2, 0.5); [38, 45, 50].forEach(function (n) { I.strings(o, t + 0.25, n, 1.6, 0.9); }); I.timpani(o, t + 0.25, 38, 0.6); },
      question: function () { I.bell(o, t, 81, 0.7); I.bell(o, t + 0.13, 88, 0.6); I.swell(o, t, 0.35, 0.4, true); },
      select: function () { I.wood(o, t, 0.5, 1900); I.bell(o, t, 84, 0.35); },
      voteIn: function () { I.wood(o, t, 0.25, 2400); },
      tick: function () { I.wood(o, t, 0.6, 1500); },
      tickLast: function () { I.wood(o, t, 0.85, 2100); I.bell(o, t, 93, 0.25); },
      voteEnd: function () { I.wood(o, t, 1, 900); I.timpani(o, t, 33, 0.7); I.swell(o, t, 0.9, 0.6, true); },
      drumroll: function () { for (var i = 0; i < 26; i++) I.snare(o, t + i * 0.068, 0.12 + i * 0.022); I.swell(o, t, 1.75, 0.8); },
      majority: function () { I.timpani(o, t, 38, 1); [50, 55, 57, 62].forEach(function (n) { I.brass(o, t, n, 0.9, 0.9); }); I.noise(o, t, 1.2, 0.25, 'highpass', 5500); }, // neutraler Quartvorhalt: verrät nichts
      suspense: function () { I.timpani(o, t, 36, 0.7); [48, 54].forEach(function (n) { I.strings(o, t, n, 1.4, 0.9); }); },
      correct: function () {
        [67, 72, 76].forEach(function (n, i) { I.brass(o, t + i * 0.11, n, 0.12, 0.9); I.piano(o, t + i * 0.11, n + 12, 0.12, 0.5); });
        [60, 64, 67, 72].forEach(function (n) { I.brass(o, t + 0.34, n, 1.1, 1); I.strings(o, t + 0.34, n + 12, 1.2, 0.8); });
        I.bass(o, t + 0.34, 36, 1.0, 0.9); I.timpani(o, t + 0.34, 36, 0.8); I.swell(o, t + 0.3, 1.1, 0.5, true);
      },
      wrong: function () {
        [53, 56, 60].forEach(function (n) { I.brass(o, t, n, 0.36, 0.7); });
        [48, 51, 55].forEach(function (n) { I.brass(o, t + 0.42, n, 1.0, 0.8); I.strings(o, t + 0.42, n, 1.2, 0.7); });
        I.timpani(o, t + 0.42, 36, 0.6); I.piano(o, t + 0.42, 36, 1.2, 0.5);
      },
      verdict: function () { I.wood(o, t, 1, 880); I.wood(o, t + 0.35, 1, 860); I.wood(o, t + 0.7, 1, 840); I.timpani(o, t + 0.7, 36, 0.9); [48, 55, 60, 64].forEach(function (n) { I.brass(o, t + 0.75, n, 1.6, 0.9); }); }
    };
    if (S[name]) S[name]();
  }

  // ---------- Zustände des Spiels → Musik ----------
  var stage = document.getElementById('stage');
  var G = function () { return window.__game && window.__game.state(); };
  var pause = 0;          // kurze Musikpause für Effekte (Ergebnis, Bewertung)
  var finalTrack = 'finaleHigh';
  function desired() {
    var st = G(); if (!st) return null;
    if (Date.now() < pause) return null;
    var cl = stage.classList;
    if (cl.contains('cinema-on')) return 'trial';
    switch (st.scene) {
      case 'title': case 'opening': case 'summary': return 'prelude';
      case 'cinema': case 'intro': case 'explain': return 'trial';
      case 'question':
        if (cl.contains('show-vote-result')) return null;
        if (cl.contains('live-voting') || (window.__game.timer && window.__game.timer.running)) return 'vote';
        return document.documentElement.classList.contains('live-room') ? 'vote' : 'trial';
      case 'final': return finalTrack;
    }
    return 'prelude';
  }
  function refresh() { if (unlocked) play(desired()); }
  setInterval(function () { refresh(); duck(stage.classList.contains('speaking')); }, 300);
  // sofort reagieren, wenn die Richterin zu sprechen beginnt oder aufhört
  new MutationObserver(function () { duck(stage.classList.contains('speaking')); }).observe(stage, { attributes: true, attributeFilter: ['class'] });

  var lastScene = '';
  window.addEventListener('game-scene', function (e) {
    var d = e.detail, k = d.name + ':' + d.c + ':' + d.q;
    if (k === lastScene) return;
    var prev = lastScene.split(':')[0];
    lastScene = k;
    if (d.name === 'opening' && prev !== 'opening') sfx('trialStart');
    else if (d.name === 'question') sfx('question');
    else if (d.name === 'intro' && prev === 'cinema') sfx('gavel');
    refresh();
  });
  window.addEventListener('game-answer', function () { sfx('select'); });
  window.addEventListener('game-judged', function (e) {
    var d = e.detail;
    pause = Date.now() + 1600; play(null, { fade: 0.25 });
    if (!d.skipped) sfx(d.ok ? 'correct' : 'wrong');
    setTimeout(refresh, 1650);
  });
  window.addEventListener('game-final', function (e) {
    finalTrack = e.detail.score >= 700 ? 'finaleHigh' : 'finaleLow';
    pause = Date.now() + 2400; play(null, { fade: 0.4 });
    sfx('verdict');
    setTimeout(refresh, 2450);
  });
  window.addEventListener('vote-countdown', function (e) {
    var s = e.detail.sec;
    setIntensity(s <= 8 ? 2 : s <= 15 ? 1 : 0);
    if (s > 0 && s <= 5) sfx(s === 1 ? 'tickLast' : 'tick');
  });
  window.addEventListener('vote-received', function () { sfx('voteIn'); });
  window.addEventListener('vote-result', function (e) {
    var kind = e.detail.kind;
    pause = Date.now() + 3200; play(null, { fade: 0.3 });     // Abstimmungsmusik endet beim Abstimmungsschluss
    if (kind === 'decision') { sfx('voteEnd'); setTimeout(function () { sfx('drumroll'); }, 150); setTimeout(function () { sfx('majority'); }, 1900); }
    else if (kind === 'decided') { setTimeout(function () { sfx('majority'); }, 1900); } // Entscheidung nach Gleichstand
    else if (kind === 'skipped') sfx('gavel');
    else { sfx('voteEnd'); setTimeout(function () { sfx('suspense'); }, 1900); }
  });

  // ---------- Bedienelemente ----------
  function $(id) { return document.getElementById(id); }
  function renderUi() {
    var m = $('audio-mute');
    if (m) {
      m.classList.toggle('muted', settings.muted || !unlocked);
      m.title = !unlocked ? 'Ton wird beim ersten Klick aktiviert' : settings.muted ? 'Ton einschalten' : 'Ton ausschalten';
      m.setAttribute('aria-pressed', settings.muted ? 'true' : 'false');
    }
    if ($('au-music')) {
      $('au-music').textContent = '♪ Musik: ' + (settings.music ? 'AN' : 'AUS');
      $('au-sfx').textContent = '🔔 Effekte: ' + (settings.sfx ? 'AN' : 'AUS');
      $('au-mvol').value = Math.round(settings.musicVol * 100);
      $('au-svol').value = Math.round(settings.sfxVol * 100);
      $('au-status').textContent = !AC ? 'nicht unterstützt' : !unlocked ? '● wartet auf Klick' : settings.muted ? '● stumm' : '● aktiv';
      $('au-status').className = 'ap-conn ' + (unlocked && !settings.muted ? 'ok' : 'bad');
    }
  }
  function set(k, v) { settings[k] = v; save(); applyLevels(); renderUi(); }
  function bind(id, ev, fn) { var e = $(id); if (e) e.addEventListener(ev, fn); }
  bind('audio-mute', 'click', function () { unlock(); set('muted', !settings.muted); });
  bind('au-music', 'click', function () { set('music', !settings.music); });
  bind('au-sfx', 'click', function () { set('sfx', !settings.sfx); });
  bind('au-mvol', 'input', function (e) { set('musicVol', Number(e.target.value) / 100); });
  bind('au-svol', 'input', function (e) { set('sfxVol', Number(e.target.value) / 100); });
  bind('au-test', 'click', function () {
    unlock();
    if (settings.muted) set('muted', false);
    sfx('gavel'); setTimeout(function () { sfx('correct'); }, 700);
  });
  renderUi();

  // Analyse-Schnittstelle (für automatische Tests: Pegelmessung am Ausgang)
  var analyser = null;
  function level(ms) {
    if (!ctx) return Promise.resolve({ rms: 0, peak: 0 });
    if (!analyser) { analyser = ctx.createAnalyser(); analyser.fftSize = 2048; comp.connect(analyser); }
    var buf = new Float32Array(analyser.fftSize), sum = 0, n = 0, peak = 0, t0 = performance.now();
    return new Promise(function (res) {
      (function sample() {
        analyser.getFloatTimeDomainData(buf);
        for (var i = 0; i < buf.length; i++) { sum += buf[i] * buf[i]; n++; if (Math.abs(buf[i]) > peak) peak = Math.abs(buf[i]); }
        if (performance.now() - t0 < ms) setTimeout(sample, 20); else res({ rms: Math.sqrt(sum / n), peak: peak });
      })();
    });
  }

  window.__audio = {
    unlock: unlock, play: play, sfx: sfx, settings: settings, level: level, tracks: Object.keys(TRACKS),
    state: function () {
      var cur = tracks.filter(function (x) { return !x.stopAt; })[0];
      return { unlocked: unlocked, ctx: ctx ? ctx.state : null, track: cur ? cur.name : null, playing: tracks.filter(function (x) { return !x.stopAt; }).length, ducked: ducked, muted: settings.muted, log: log.slice(-40) };
    }
  };
})();
