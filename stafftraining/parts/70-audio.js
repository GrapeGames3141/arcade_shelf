// ---------- procedural audio ----------
const AU = {
  ctx: null, master: null, sfx: null, music: null, noiseBuf: null, nextNote: 0, step: 0, musicOn: false, purrG: null, purrUntil: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = SETTINGS.sound ? 0.85 : 0; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(comp);
    this.music = c.createGain(); this.music.gain.value = 0.13; this.music.connect(comp);
    const len = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, len, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // purr: low noise chopped at ~25 Hz
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170;
    const am = c.createGain(); am.gain.value = 0.5; const lfo = c.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = 24; const lg = c.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    this.purrG = c.createGain(); this.purrG.gain.value = 0; src.connect(lp); lp.connect(am); am.connect(this.purrG); this.purrG.connect(this.sfx); src.start(); lfo.start();
    setInterval(() => this.tick(), 90);
  },
  setOn(on) { if (this.master) this.master.gain.value = on ? 0.85 : 0; },
  vol(x, z) { if (x === undefined) return 1; return clamp(1.5 / (1 + d2(x, z, CAM.pos[0], CAM.pos[2]) * 0.22), 0.08, 1); },
  noise(dur, f0, f1, q, vol, type = 'bandpass', at = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  },
  tone(f, dur, type, vol, f1, at = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
  },
  meow(n) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, dur = [0, 0.42, 0.62, 1.05][n], f0 = [0, 540, 600, 500][n] * (0.95 + Math.random() * 0.1);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 + n * 0.08, t + 0.06); g.gain.setValueAtTime(0.32 + n * 0.08, t + dur * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2; bp.frequency.setValueAtTime(850, t); bp.frequency.linearRampToValueAtTime(2300, t + dur * 0.35); bp.frequency.linearRampToValueAtTime(1000, t + dur);
    for (const [ty, m, v] of [['sawtooth', 1, 1], ['square', 2.01, 0.35]]) {
      const o = c.createOscillator(); o.type = ty; o.frequency.setValueAtTime(f0 * 0.82 * m, t); o.frequency.linearRampToValueAtTime(f0 * 1.32 * m, t + dur * 0.3); o.frequency.linearRampToValueAtTime(f0 * (n === 3 ? 0.72 : 0.92) * m, t + dur);
      if (n === 3) { const l = c.createOscillator(); l.frequency.value = 7; const lg = c.createGain(); lg.gain.value = 28; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur); }
      const og = c.createGain(); og.gain.value = v; o.connect(og); og.connect(bp); o.start(t); o.stop(t + dur + 0.05);
    }
    bp.connect(g); g.connect(this.sfx);
  },
  mrow() { if (!this.ctx) return; this.tone(480, 0.3, 'sawtooth', 0.12, 300); this.noise(0.25, 1500, 900, 3, 0.08); },
  purr(d) { if (!this.ctx) return; this.purrUntil = Math.max(this.purrUntil, this.ctx.currentTime + d); },
  purrHold() { this.purr(0.3); },
  blah(h, s) {
    if (!this.ctx) return; const c = this.ctx, n = clamp(Math.round(s.length / 4), 2, 11), loud = /[A-Z]{3}|!/.test(s) ? 1.35 : 1, v = this.vol(h.x, h.z) * 0.07 * loud, base = h.look.voice * (loud > 1 ? 1.18 : 1);
    for (let i = 0; i < n; i++) {
      const t = c.currentTime + i * 0.075, f = base * (0.85 + Math.random() * 0.5) * (i === n - 1 && s.endsWith('?') ? 1.4 : 1);
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.92, t + 0.06);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; o.connect(lp); lp.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.09);
    }
  },
  hop() { this.noise(0.12, 500, 1400, 1.2, 0.07); },
  land(k) { this.tone(120, 0.1, 'sine', 0.12 + Math.min(0.2, k * 0.12), 60); this.noise(0.06, 500, 200, 1, 0.06); },
  zoom() { this.noise(0.35, 500, 2200, 1.5, 0.14); this.skitter(); },
  skitter() { for (let i = 0; i < 7; i++) this.noise(0.03, 2600, 1800, 3, 0.06, 'bandpass', i * 0.06 + Math.random() * 0.02); },
  thud(x, z, k = 1) { const v = this.vol(x, z); this.tone(110, 0.16, 'sine', 0.3 * k * v, 50); this.noise(0.1, 800, 200, 1, 0.14 * k * v); },
  tink(x, z) { this.tone(1500 + Math.random() * 1200, 0.08, 'triangle', 0.05 * this.vol(x, z)); },
  shatter(x, z) { const v = this.vol(x, z); this.noise(0.4, 5000, 1500, 0.8, 0.4 * v); for (let i = 0; i < 9; i++) this.tone(1800 + Math.random() * 3000, 0.14, 'triangle', 0.07 * v, null, i * (0.02 + Math.random() * 0.04)); this.tone(140, 0.14, 'sine', 0.3 * v, 60); },
  splash() { this.noise(0.5, 1200, 400, 0.6, 0.35); this.noise(0.3, 4000, 2000, 1, 0.15, 'bandpass', 0.05); },
  spray() { this.noise(0.22, 5000, 7000, 1.2, 0.3, 'highpass'); this.noise(0.18, 5000, 7000, 1.2, 0.25, 'highpass', 0.28); },
  pour() { for (let i = 0; i < 16; i++) this.tone(900 + Math.random() * 1600, 0.05, 'triangle', 0.05, null, i * 0.045 + Math.random() * 0.02); },
  crunch() { for (let i = 0; i < 7; i++) this.noise(0.07, 1800, 900, 2, 0.12, 'bandpass', i * 0.32 + Math.random() * 0.05); },
  scratch() { for (let i = 0; i < 4; i++) this.noise(0.11, 1500, 3200, 2, 0.16, 'bandpass', i * 0.14); },
  pat() { this.noise(0.05, 700, 400, 1, 0.1); },
  oof(h, k = 1) { const f = h.look.voice * 1.1; this.tone(f, 0.2, 'sawtooth', 0.045 * k, f * 0.6); },
  door() { this.tone(180, 0.35, 'sawtooth', 0.03, 260); this.noise(0.1, 900, 500, 2, 0.08); },
  doorShut() { this.tone(95, 0.12, 'sine', 0.25, 55); this.noise(0.07, 700, 300, 1, 0.14); },
  click() { this.noise(0.03, 3000, 2000, 2, 0.12); },
  ding() { this.tone(1318, 0.25, 'sine', 0.08); this.tone(1760, 0.4, 'sine', 0.07, null, 0.09); },
  objective() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.09, null, i * 0.09)); },
  keys() { for (let i = 0; i < 9; i++) this.noise(0.025, 2500, 2000, 4, 0.07, 'bandpass', i * 0.05 + Math.random() * 0.02); },
  stretch() { this.noise(0.5, 300, 700, 1, 0.06); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.1, null, i * 0.11)); },
  lose() { [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.05, null, i * 0.18)); },
  alarm() { for (let i = 0; i < 6; i++) this.tone(1900, 0.09, 'square', 0.06, null, i * 0.18); },
  startMusic() { this.init(); if (!this.ctx) return; this.musicOn = true; this.nextNote = this.ctx.currentTime + 0.1; this.step = 0; },
  stopMusic() { this.musicOn = false; },
  tick() {
    if (!this.ctx) return; const c = this.ctx;
    this.purrG.gain.setTargetAtTime(c.currentTime < this.purrUntil ? 0.55 : 0, c.currentTime, 0.08);
    if (!this.musicOn) return;
    const sleepy = LESSON && LESSON.sleepy && G.phase === 'play', spb = 60 / (sleepy ? 76 : 104) / 2;
    const prog = [[48, 52, 55, 59], [45, 49, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53]];
    const mel = [76, -1, 79, 81, 79, -1, 76, -1, 74, -1, 72, -1, -1, 71, 72, -1, 77, -1, 81, 83, 81, -1, 79, -1, 74, -1, 77, -1, 79, 78, 79, -1];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    while (this.nextNote < c.currentTime + 0.25) {
      const t = this.nextNote, s = this.step, ch = prog[Math.floor(s / 8) % 4];
      const note = (f, d, type, vol) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(this.music); o.start(t); o.stop(t + d + 0.05); };
      if (!sleepy) { if (s % 4 === 0) note(hz(ch[(s / 4) % 2 ? 2 : 0] - 12), spb * 1.6, 'triangle', 0.6); if (s % 8 === 3 || s % 8 === 6) note(hz(ch[1 + (s % 3)] + 12), spb * 0.9, 'sine', 0.14); }
      else if (s % 8 === 0) note(hz(ch[0]), spb * 6, 'sine', 0.3);
      const m = mel[s % 32]; if (m > 0 && (!sleepy || s % 2 === 0)) { note(hz(m + (sleepy ? 12 : 0)), spb * (sleepy ? 3 : 1.5), 'sine', sleepy ? 0.16 : 0.26); if (!sleepy) note(hz(m + 12), spb * 0.6, 'sine', 0.05); }
      this.nextNote += spb; this.step++;
    }
  }
};
