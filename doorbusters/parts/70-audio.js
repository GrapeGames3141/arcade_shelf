// ---------- procedural audio ----------
const AU = {
  ctx: null, master: null, sfx: null, music: null, crowdG: null, noiseBuf: null, musicOn: false, nextNote: 0, step: 0, lastVoice: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = SETTINGS.sound ? 0.8 : 0; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(comp);
    this.music = c.createGain(); this.music.gain.value = 0.16; this.music.connect(comp);
    const len = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, len, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // crowd murmur bed
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7;
    const bp2 = c.createBiquadFilter(); bp2.type = 'peaking'; bp2.frequency.value = 1500; bp2.gain.value = 6;
    this.crowdG = c.createGain(); this.crowdG.gain.value = 0; src.connect(bp); bp.connect(bp2); bp2.connect(this.crowdG); this.crowdG.connect(comp);
    const lfo = c.createOscillator(); lfo.frequency.value = 0.37; const lg = c.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(bp.frequency); lfo.start(); src.start();
    setInterval(() => this.schedule(), 90);
  },
  setOn(on) { if (this.master) this.master.gain.value = on ? 0.8 : 0; if (!on && window.speechSynthesis) speechSynthesis.cancel(); },
  pan(x, z) { // simple stereo pan + distance from camera
    if (x === undefined) return [1, 0];
    const dx = x - CAM.pos[0], dz = z - CAM.pos[2], d = hyp(dx, dz);
    const fx = CAM.tgt[0] - CAM.pos[0], fz = CAM.tgt[2] - CAM.pos[2], fl = hyp(fx, fz) || 1;
    const rx = -fz / fl, rz = fx / fl; const p = d > 0.1 ? clamp((dx * rx + dz * rz) / d, -1, 1) * -1 : 0;
    return [clamp(1.4 / (1 + d * 0.12), 0, 1), p];
  },
  out(x, z) { const c = this.ctx; const [v, p] = this.pan(x, z); const g = c.createGain(); g.gain.value = v; if (c.createStereoPanner) { const sp = c.createStereoPanner(); sp.pan.value = p; g.connect(sp); sp.connect(this.sfx); } else g.connect(this.sfx); return g; },
  noise(dur, f0, f1, q, vol, x, z, type = 'bandpass', at = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = rr(0.8, 1.2);
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out(x, z)); s.start(t, rr(0, 1.5)); s.stop(t + dur + 0.05);
  },
  tone(f, dur, type, vol, x, z, f1, at = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out(x, z)); o.start(t); o.stop(t + dur + 0.05);
  },
  crash(k, x, z, wall) {
    if (!this.ctx) return; k = clamp(k, 0.05, 1.3);
    this.noise(0.25 + k * 0.25, 2500, 400, 0.8, 0.5 * k, x, z);
    for (const f of [523, 787, 1130, 1475]) this.tone(f * rr(0.9, 1.1) * (wall ? 0.7 : 1), 0.2 + k * 0.35, 'triangle', 0.07 * k, x, z);
    this.tone(90, 0.18, 'sine', 0.4 * k, x, z, 40);
  },
  clatter(x, z) { for (let i = 0; i < 9; i++) this.tone(rr(600, 2400), 0.12, 'triangle', 0.06, x, z, null, i * rr(0.03, 0.08)); this.noise(0.5, 3000, 600, 0.6, 0.25, x, z); },
  tink(x, z) { this.tone(rr(1500, 2800), 0.08, 'triangle', 0.04, x, z); },
  thud(x, z, k = 1) { this.tone(110, 0.15, 'sine', 0.3 * k, x, z, 50); this.noise(0.1, 800, 200, 1, 0.15 * k, x, z); },
  oof(x, z, s = 1) { this.thud(x, z, 0.8); const f = rr(180, 320) / s; this.tone(f, 0.22, 'sawtooth', 0.06, x, z, f * 0.6); this.noise(0.2, 900 / s, 400, 4, 0.1, x, z); },
  whoosh(c) { if (!this.ctx || !c.isPlayer) return; this.noise(0.3, 400, 1800, 1.5, 0.25); this.tone(140, 0.12, 'sawtooth', 0.04, undefined, undefined, 90); },
  grab() { this.tone(880, 0.07, 'square', 0.05); this.tone(1320, 0.1, 'square', 0.05, undefined, undefined, null, 0.06); },
  buzz() { this.tone(160, 0.25, 'sawtooth', 0.08); },
  beep(f = 1800, v = 0.1) { this.tone(f, 0.09, 'sine', v); },
  chaching() { this.noise(0.15, 6000, 3000, 2, 0.12); this.tone(2093, 0.25, 'triangle', 0.06, undefined, undefined, null, 0.05); this.tone(2637, 0.35, 'triangle', 0.05, undefined, undefined, null, 0.1); },
  receipt() { for (let i = 0; i < 10; i++) this.noise(0.04, 3500, 3000, 3, 0.05, undefined, undefined, 'bandpass', i * 0.05); },
  cheer() { this.noise(0.9, 1200, 900, 0.6, 0.18); },
  chime(flash) { const n = flash ? [784, 988, 1175, 1568] : [659, 523, 392]; n.forEach((f, i) => this.tone(f, 0.6, 'sine', 0.12, undefined, undefined, null, i * 0.18)); },
  count(n, end) { this.tone(end ? 880 : 520, 0.25, 'square', 0.08); if (!end) this.noise(0.6, 900, 700, 0.5, 0.3); },
  doors() { this.noise(1.4, 300, 1200, 0.7, 0.4, 0, 0.3); this.tone(1046, 0.4, 'sine', 0.1); this.tone(1568, 0.6, 'sine', 0.1, undefined, undefined, null, 0.12); },
  roar() { if (!this.crowdG) return; const g = this.crowdG.gain, t = this.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.7, t + 0.4); g.linearRampToValueAtTime(0.14, t + 6); this.noise(2.5, 1500, 700, 0.5, 0.5); },
  closing() { this.chime(false); if (this.crowdG) this.crowdG.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 3); },
  startAmbience() { this.init(); if (!this.ctx) return; const t = this.ctx.currentTime; this.crowdG.gain.cancelScheduledValues(t); this.crowdG.gain.setValueAtTime(0.0, t); this.crowdG.gain.linearRampToValueAtTime(0.3, t + 1.5); this.musicOn = true; this.nextNote = t + 0.1; this.step = 0; },
  stopAll() { this.musicOn = false; if (this.crowdG) this.crowdG.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5); },
  // cheesy store muzak: I-vi-ii-V with sleigh bells
  schedule() {
    if (!this.ctx || !this.musicOn) return;
    const c = this.ctx, spb = 60 / 116 / 2;
    const prog = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]];
    const mel = [76, 74, 72, 74, 76, 76, 76, -1, 74, 74, 74, -1, 76, 79, 79, -1, 76, 74, 72, 74, 76, 76, 76, 76, 74, 74, 76, 74, 72, -1, -1, -1];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    while (this.nextNote < c.currentTime + 0.25) {
      const t = this.nextNote, s = this.step, chord = prog[Math.floor(s / 8) % 4];
      const inStore = G.phase === 'sale' || G.phase === 'closed';
      const v = inStore ? 1 : 0.35;
      const note = (f, d, type, vol) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(this.music); o.start(t); o.stop(t + d + 0.05); };
      if (s % 8 === 0) note(hz(chord[0] - 24), spb * 7, 'triangle', 0.5);
      if (s % 8 === 4) note(hz(chord[2] - 24), spb * 3, 'triangle', 0.35);
      if (s % 2 === 0) note(hz(chord[(s / 2) % 4]), spb * 2.5, 'sine', 0.18);
      const m = mel[s % 32]; if (m > 0 && inStore) { note(hz(m), spb * 1.8, 'sine', 0.22); note(hz(m + 12), spb * 1.2, 'sine', 0.05); }
      if (inStore && s % 2 === 1) { const ns = c.createBufferSource(); ns.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = c.createGain(); g.gain.setValueAtTime(0.12 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08); ns.connect(f); f.connect(g); g.connect(this.music); ns.start(t, Math.random()); ns.stop(t + 0.1); }
      this.nextNote += spb; this.step++;
    }
    const urgent = G.phase === 'sale' && G.saleT < 30;
    this.music.gain.value = urgent ? 0.22 : 0.16;
  },
  say(text) {
    if (!window.speechSynthesis || TEST) return;
    try { const now = performance.now(); if (now - this.lastVoice < 1500) speechSynthesis.cancel(); this.lastVoice = now; const u = new SpeechSynthesisUtterance(text); u.rate = 1.08; u.pitch = 0.95; u.volume = 0.8; speechSynthesis.speak(u); } catch (e) { }
  }
};
