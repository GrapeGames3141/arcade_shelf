// ---------- synthesized sound: forest air, birds, rushing water, roars, splashes, hikers ----------
const AUD = {
  ctx: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    let ctx; try { ctx = new AC(); } catch (e) { return; }
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 5;
    this.master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0); let b = 0;
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate); const e = this.brown.getChannelData(0);
    for (let i = 0; i < len; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; e[i] = b * 3.5; }
    // beds: wind in the trees, near water, the waterfall roar
    this.wind = this.bed(this.brown, 'lowpass', 500, 0.0);
    this.creek = this.bed(this.noise, 'bandpass', 1400, 0.0, 0.6);
    this.falls = this.bed(this.brown, 'lowpass', 900, 0.0);
    this.birdT = 1; this.apply();
  },
  bed(buf, type, f, vol, q = 0.7) {
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(this.master); s.start();
    return { g, fl };
  },
  apply() { if (this.ctx) this.master.gain.setTargetAtTime(SET.sound ? 0.9 : 0, this.ctx.currentTime, 0.08); },
  sp(x, z) {
    if (x === undefined) return { v: 1, p: 0 };
    const dx = x - RND.cam[0], dz = z - RND.cam[2], d = Math.hypot(dx, dz) || 1, v = RND.view;
    return { v: 1 / (1 + d / 10), p: clamp((dx * v[0] + dz * v[8]) / d, -1, 1) * 0.7 };
  },
  out(vol, pan = 0) {
    const g = this.ctx.createGain(); g.gain.value = vol;
    if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.master); } else g.connect(this.master);
    return g;
  },
  tone(f0, f1, dur, type, vol, pan = 0, delay = 0, attack = 0.01) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.out(0, pan); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); o.start(t); o.stop(t + dur + 0.05); return o;
  },
  hiss(dur, type, f0, f1, vol, pan = 0, delay = 0, q = 1, buf) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = buf || this.noise; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = this.out(0, pan); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl); fl.connect(g); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  },
  // a bear roar: growling sawtooth through a vowel-like formant, with breathy noise
  roar() {
    if (!this.ctx) return; const t = this.ctx.currentTime, dur = 1.5;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(115, t + 0.35); o.frequency.linearRampToValueAtTime(80, t + dur);
    const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 28; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency);
    const f1 = this.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 3; f1.frequency.setValueAtTime(380, t); f1.frequency.linearRampToValueAtTime(650, t + 0.4); f1.frequency.linearRampToValueAtTime(420, t + dur);
    const g = this.out(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.15); g.gain.setValueAtTime(0.9, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f1); f1.connect(g); o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    this.hiss(dur, 'bandpass', 700, 400, 0.35, 0, 0, 1.2);
    this.tone(55, 45, dur, 'triangle', 0.35);
  },
  huff() { this.hiss(0.25, 'bandpass', 500, 300, 0.2, 0, 0, 1.5); },
  thud(v) { this.tone(90, 40, 0.25, 'sine', 0.5 * v); this.hiss(0.2, 'lowpass', 400, 100, 0.3 * v); },
  step(run, wet) {
    if (!this.ctx) return;
    if (wet) this.hiss(0.18, 'bandpass', 1800, 800, run ? 0.16 : 0.09, 0, 0, 1);
    else this.hiss(0.09, 'lowpass', 300, 120, run ? 0.18 : 0.09, 0, 0, 1, this.brown);
  },
  splash(x, z, s = 1) { const q = this.sp(x, z); this.hiss(0.5 + s * 0.4, 'bandpass', 2400, 600, 0.55 * s * q.v, q.p, 0, 0.8); this.tone(260, 90, 0.18, 'sine', 0.15 * s * q.v, q.p); },
  shake() { for (let i = 0; i < 7; i++) this.hiss(0.12, 'bandpass', 2200, 1500, 0.12, i % 2 ? 0.4 : -0.4, i * 0.13, 1.2); },
  swish() { this.hiss(0.2, 'bandpass', 900, 2500, 0.18, 0, 0, 2); },
  munch(delay = 0) { for (let i = 0; i < 3; i++) this.hiss(0.07, 'bandpass', 1100 + Math.random() * 600, 500, 0.22, 0, delay + i * 0.11, 2); },
  catchFish() { this.tone(520, 780, 0.12, 'triangle', 0.18); this.tone(780, 1040, 0.16, 'triangle', 0.16, 0, 0.1); },
  chime() { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, f, 0.5, 'sine', 0.12, 0, i * 0.08)); },
  click(x, z) { const q = this.sp(x, z); this.hiss(0.04, 'highpass', 3000, 3000, 0.3 * q.v, q.p); this.hiss(0.05, 'highpass', 2500, 2500, 0.2 * q.v, q.p, 0.07); },
  // a startled shout: a pitch-swooping voiced tone with two formants
  yelp(x, z, scale = 1) {
    if (!this.ctx) return; const q = this.sp(x, z), t = this.ctx.currentTime, f = (200 + Math.random() * 160) / scale, dur = 0.5;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.8, t + 0.12); o.frequency.exponentialRampToValueAtTime(f * 1.1, t + dur);
    const g = this.out(0, q.p); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4 * q.v, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const [ff, qq] of [[800, 5], [1250, 6]]) { const b = this.ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = qq; o.connect(b); b.connect(g); }
    o.start(t); o.stop(t + dur + 0.05);
  },
  bird() {
    const p = (Math.random() * 2 - 1) * 0.8, kind = Math.random(), v = 0.05 + Math.random() * 0.04;
    if (kind < 0.4) { const f = 2600 + Math.random() * 1400; for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) this.tone(f, f * 1.3, 0.07, 'sine', v, p, i * 0.11); }
    else if (kind < 0.75) { const f = 1800 + Math.random() * 600; this.tone(f * 1.4, f, 0.35, 'sine', v, p); this.tone(f, f * 0.8, 0.4, 'sine', v * 0.9, p, 0.45); }
    else { const f = 3200 + Math.random() * 900; for (let i = 0; i < 8; i++) this.tone(f, f * 0.85, 0.035, 'triangle', v * 0.8, p, i * 0.05); }
  },
  update(dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, c = RND.cam;
    const [ri, rd] = riverNear(c[0], c[2]); const lakeD = Math.max(0, Math.hypot(c[0] - LAKE.x, c[2] - LAKE.z) - LAKE.r);
    const creek = clamp(1 - (rd - RIVER.w[ri]) / 30, 0, 1) * 0.12 + clamp(1 - lakeD / 25, 0, 1) * 0.03;
    const fb = SCENERY.fallsBottom, fd = Math.hypot(c[0] - fb[0], c[2] - fb[2]);
    this.creek.g.gain.setTargetAtTime(creek, t, 0.3);
    this.falls.g.gain.setTargetAtTime(0.7 / (1 + (fd / 18) ** 2), t, 0.3);
    this.wind.g.gain.setTargetAtTime(0.12 + 0.08 * Math.sin(RND.time * 0.13) + (c[1] > 25 ? 0.08 : 0), t, 1.0);
    this.birdT -= dt; if (this.birdT <= 0 && GAME.mode !== 'paused') { this.birdT = 1.5 + Math.random() * 5; this.bird(); }
  }
};
