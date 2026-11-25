// ================= sound: baas, blasts, timber and stone, the bell =================
const AUD = {
  ctx: null,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; try { this.ctx = new AC(); } catch (e) { return; } this.m = this.ctx.createGain(); const c = this.ctx.createDynamicsCompressor(); this.m.connect(c); c.connect(this.ctx.destination); const n = this.ctx.sampleRate * 2; this.nb = this.ctx.createBuffer(1, n, this.ctx.sampleRate); const d = this.nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.apply(); },
  apply() { if (this.ctx) this.m.gain.setTargetAtTime(SET.sound ? 0.8 : 0, this.ctx.currentTime, 0.05); },
  tone(f0, f1, dur, type, vol, delay = 0, a = 0.01) { if (!this.ctx) return; const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(this.m); o.start(t); o.stop(t + dur + 0.05); },
  noise(dur, type, f0, f1, vol, delay = 0, q = 1) { if (!this.ctx) return; const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = this.nb; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(f); f.connect(g); g.connect(this.m); s.start(t, Math.random()); s.stop(t + dur + 0.05); },
  // a "baa": buzzy voice through two formants with a wobble, sliding down
  baa(p = 1) {
    if (!this.ctx) return; const t = this.ctx.currentTime, dur = 0.55, o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(320 * p, t); o.frequency.linearRampToValueAtTime(280 * p, t + dur);
    lfo.frequency.value = 22; lg.gain.value = 18 * p; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.05); g.gain.setValueAtTime(0.22, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const [f, q] of [[750, 6], [1250, 8]]) { const b = this.ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f * Math.sqrt(p); b.Q.value = q; o.connect(b); b.connect(g); }
    g.connect(this.m); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  },
  boom(R, chain = 1) { const k = clamp(R / 90, 0.5, 2.2); this.noise(0.5 + k * 0.5, 'lowpass', 1400, 60, 0.5 + 0.2 * k); this.tone(90 / Math.sqrt(chain), 32, 0.5 + k * 0.3, 'sine', 0.5); this.noise(0.25, 'bandpass', 3000, 900, 0.12 * k, 0.02, 1.5); },
  thud(v, piece) { const stone = piece === 'stone' || piece === 'slab'; this.tone(stone ? 140 : 110, 60, 0.18, stone ? 'square' : 'sine', 0.12 * v); this.noise(0.12, 'lowpass', stone ? 1800 : 700, 200, 0.18 * v); },
  crunch(piece) { const f = { hay: 2600, crate: 900, plank: 1100, stone: 1600, slab: 1500 }[piece] || 1200; this.noise(0.35, 'bandpass', f, f * 0.4, 0.3, 0, 1.2); if (piece === 'stone' || piece === 'slab') this.noise(0.2, 'highpass', 3000, 2000, 0.12, 0.05); },
  place(t) { const f = t === 'stone' || t === 'slab' ? 180 : t === 'hay' ? 420 : 260; this.tone(f, f * 0.7, 0.1, 'triangle', 0.15); this.noise(0.06, 'lowpass', 800, 300, 0.12); },
  launch() { this.noise(0.4, 'bandpass', 500, 1800, 0.3, 0, 1.2); this.tone(90, 50, 0.25, 'sawtooth', 0.12); },
  bell(v = 1) { for (const [f, d, a] of [[880, 2.6, 0.2], [880 * 2.76, 1.6, 0.08], [880 * 5.4, 0.9, 0.04], [440, 3, 0.1]]) this.tone(f, f * 0.995, d, 'sine', a * v, 0, 0.004); },
  honey() { this.noise(0.25, 'lowpass', 600, 200, 0.25, 0, 2); this.tone(220, 160, 0.2, 'sine', 0.12); },
  click() { this.tone(300, 260, 0.05, 'square', 0.05); },
  ready() { this.tone(523, 523, 0.18, 'triangle', 0.14); this.tone(784, 784, 0.25, 'triangle', 0.14, 0.12); },
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.4, 'triangle', 0.15, i * 0.12)); this.bell(0.6); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.98, 0.45, 'triangle', 0.14, i * 0.15)); }
};
