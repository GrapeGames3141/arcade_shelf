// ---------- synthesized audio: thwacks, clangs, squeaks, hisses, yowls, a rattling cart, late-night alley jazz ----------
const AUD = {
  ctx: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    let ctx; try { ctx = new AC(); } catch (e) { return; }
    this.ctx = ctx;
    this.master = ctx.createGain(); this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 6;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master); this.music = ctx.createGain(); this.music.connect(this.master);
    const len = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, len, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // cart rattle loop
    const c = ctx; const v = this.rat = {};
    v.src = c.createBufferSource(); v.src.buffer = this.noise; v.src.loop = true;
    v.f = c.createBiquadFilter(); v.f.type = 'bandpass'; v.f.frequency.value = 3200; v.f.Q.value = 1.2; v.g = c.createGain(); v.g.gain.value = 0;
    v.src.connect(v.f); v.f.connect(v.g); v.g.connect(this.sfx); v.src.start();
    this.apply(); this.jazzStart();
  },
  apply() { if (!this.ctx) return; const t = this.ctx.currentTime; this.master.gain.setTargetAtTime(SET.sound ? 0.85 : 0, t, 0.05); this.music.gain.setTargetAtTime(SET.music ? (this.ducked ? 0.04 : 0.16) : 0, t, 0.2); },
  duck(on) { this.ducked = on; this.apply(); },
  ok() { return this.ctx && SET.sound && this.ctx.state === 'running'; },
  sp(x, z) { if (x === undefined) return { v: 1, p: 0 }; const dx = x - RND.cam[0], dz = z - RND.cam[2], d = Math.hypot(dx, dz) || 1; const v = RND.view; return { v: 1 / (1 + d / 7), p: clamp((dx * v[0] + dz * v[8]) / d, -1, 1) * 0.7 }; },
  out(vol, pan) { const g = this.ctx.createGain(); g.gain.value = vol; if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.sfx); } else g.connect(this.sfx); return g; },
  tone(f0, f1, dur, type, vol, pan, attack = 0.005, delay = 0, dest) {
    const c = this.ctx, t = c.currentTime + delay; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.out(1, pan)); o.start(t); o.stop(t + dur + 0.05); return o;
  },
  burst(dur, vol, pan, type, f0, f1, Q = 1, delay = 0, dest) {
    const c = this.ctx, t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = F1(0.8, 1.2);
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = Q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(Math.max(0.0002, vol), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.out(1, pan)); s.start(t, F1(0, 1.5)); s.stop(t + dur + 0.05);
  },
  // a squeaky/yowly voice: sawtooth through formants
  voice(x, z, f0, f1, dur, formants, vol, vib = 0) {
    const s = this.sp(x, z); const ctx = this.ctx, t = ctx.currentTime; const v = Math.max(0.03, vol * s.v);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    if (vib) { const l = ctx.createOscillator(); l.frequency.value = vib; const lg = ctx.createGain(); lg.gain.value = f0 * 0.06; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const dest = this.out(1, s.p);
    for (const [ff, q, a] of formants) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ff; f.Q.value = q; const fg = ctx.createGain(); fg.gain.value = a; o.connect(f); f.connect(fg); fg.connect(g); }
    g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  },
  thwack(x, z, v, src) { if (!this.ok()) return; const s = this.sp(x, z); const o = this.out(1, s.p); const vol = (0.35 + v * 0.5) * Math.max(0.35, s.v);
    this.burst(0.09, vol, 0, 'bandpass', 1400 - v * 600, 500, 1.2, 0, o); this.tone(220 - v * 80, 70, 0.12, 'sine', vol * 0.9, 0, 0.002, 0, o);
    if (src === 'cart') this.burst(0.2, vol * 0.5, 0, 'highpass', 3000, 3000, 0.8, 0, o); },
  yelp(c, v = 1, big) { if (!this.ok()) return; const k = c.k, x = c.x, z = c.z, sc = 1 / c.scale;
    if (k === 'rat') this.voice(x, z, 1900 * sc, 1300 * sc, big ? 0.22 : 0.09, [[2800, 6, 1], [4200, 8, 0.5]], 0.18 * v);
    else if (k === 'possum') this.voice(x, z, 520 * sc, 380 * sc, big ? 0.45 : 0.18, [[1100, 5, 1], [2400, 6, 0.4]], 0.2 * v, 9);
    else if (k === 'cat') this.voice(x, z, 700 * sc, big ? 380 * sc : 600 * sc, big ? 0.6 : 0.2, [[900, 5, 1], [1800, 6, 0.6], [3000, 8, 0.2]], 0.24 * v, 6);
    else if (k === 'skunk') this.voice(x, z, 900 * sc, 600 * sc, 0.16, [[1600, 6, 1]], 0.15 * v);
    else if (k === 'pigeon') { this.voice(x, z, 420, 330, 0.25, [[700, 4, 1], [1300, 5, 0.4]], 0.14 * v, 18); this.burst(0.3, 0.12 * v * this.sp(x, z).v, this.sp(x, z).p, 'bandpass', 1200, 600, 1); }
    else if (k === 'gull') this.voice(x, z, 1500, 1100, big ? 0.5 : 0.25, [[2200, 6, 1], [3400, 7, 0.4]], 0.2 * v, 14);
    else if (k === 'bandit') this.voice(x, z, 800 * sc, 600 * sc, 0.18, [[1500, 6, 1], [2800, 7, 0.4]], 0.2 * v, 22); },
  ouch(k) { if (!this.ok()) return; this.voice(k.x, k.z, 1200, 800, 0.15, [[1700, 6, 1], [3100, 7, 0.4]], k.isPlayer ? 0.32 : 0.18, 25); },
  daze(k) { if (!this.ok()) return; const o = this.out(k.isPlayer ? 1 : 0.4, 0); for (let i = 0; i < 4; i++) this.tone(1400 + i * 300, 1500 + i * 300, 0.18, 'sine', 0.12, 0, 0.005, i * 0.09, o); },
  fore() { if (!this.ok()) return; this.tone(600, 1800, 0.5, 'sine', 0.15, 0, 0.02); },
  clang(x, z, v = 0.6, pitch = 1) { if (!this.ok()) return; const s = this.sp(x, z); const vol = v * Math.max(0.3, s.v); const o = this.out(1, s.p);
    for (const [f, a] of [[680, 0.35], [1530, 0.25], [2410, 0.16], [3720, 0.09]]) this.tone(f * pitch * F1(0.97, 1.03), f * pitch * 0.985, 0.35 + a, 'triangle', vol * a, 0, 0.002, 0, o);
    this.burst(0.05, vol * 0.5, 0, 'highpass', 3000, 3000, 0.7, 0, o); },
  bigClang(x, z) { if (!this.ok()) return; const o = this.out(1, this.sp(x, z).p);
    for (const [f, a] of [[310, 0.5], [740, 0.4], [1190, 0.3], [1980, 0.2], [3100, 0.12]]) this.tone(f * F1(0.98, 1.02), f * 0.99, 1.4 + a, 'triangle', a * 0.8, 0, 0.002, 0, o);
    this.burst(0.15, 0.6, 0, 'highpass', 2000, 2000, 0.7, 0, o); },
  whoosh(x, z, w, charge = 0) { if (!this.ok()) return; const s = this.sp(x, z); const big = w === 'broom' || w === 'club' || w === 'pan'; this.burst(big ? 0.28 : 0.16, (0.18 + charge * 0.3) * Math.max(0.4, s.v), s.p, 'bandpass', big ? 500 : 900, big ? 1800 : 3000, 1.6); },
  bash(x, z) { if (!this.ok()) return; this.burst(0.22, 0.3, 0, 'bandpass', 400, 1400, 1.2); },
  hop() { if (!this.ok()) return; this.tone(300, 520, 0.1, 'sine', 0.08, 0); },
  pickup() { if (!this.ok()) return; const o = this.out(1, 0); [660, 990].forEach((f, i) => this.tone(f, f, 0.12, 'triangle', 0.18, 0, 0.004, i * 0.06, o)); },
  ding() { if (!this.ok()) return; const o = this.out(1, 0); this.tone(1318, 1318, 0.6, 'sine', 0.18, 0, 0.004, 0.12, o); },
  breakW(x, z) { if (!this.ok()) return; const s = this.sp(x, z); for (let i = 0; i < 4; i++) this.burst(0.05, 0.3 * s.v, s.p, 'bandpass', F1(800, 2500), 600, 2, i * F1(0.02, 0.05)); },
  rummage(x, z) { if (!this.ok()) return; const s = this.sp(x, z); for (let i = 0; i < 7; i++) this.burst(0.08, 0.25 * s.v, s.p, 'bandpass', F1(500, 2400), F1(400, 1500), 1.5, i * F1(0.08, 0.15)); this.clang(x, z, 0.3, 0.7); },
  squirt() { if (!this.ok()) return; this.burst(0.35, 0.3, 0, 'lowpass', 900, 250, 0.8); this.tone(200, 90, 0.3, 'square', 0.04, 0); },
  click() { if (!this.ok()) return; this.burst(0.03, 0.3, 0, 'highpass', 3000, 3000, 1); },
  snap(x, z) { if (!this.ok()) return; const s = this.sp(x, z); this.burst(0.05, 0.7 * Math.max(0.4, s.v), s.p, 'highpass', 2500, 2500, 1); this.tone(1800, 400, 0.08, 'square', 0.12 * s.v, s.p); },
  plop(x, z, v) { if (!this.ok()) return; const s = this.sp(x, z); for (let i = 0; i < 3; i++) this.tone(380, 120, 0.15, 'sine', 0.3 * v * Math.max(0.3, s.v), s.p, 0.003, i * 0.1); },
  honk() { if (!this.ok()) return; const o = this.out(1, 0); for (const f of [392, 494]) { this.tone(f, f, 0.45, 'square', 0.06, 0, 0.01, 0, o); this.tone(f, f, 0.25, 'square', 0.06, 0, 0.01, 0.55, o); } },
  thud(x, z, v) { if (!this.ok()) return; const s = this.sp(x, z); const o = this.out(1, s.p); this.tone(110, 45, 0.25, 'sine', 0.6 * v * Math.max(0.3, s.v), 0, 0.003, 0, o); this.burst(0.15, 0.3 * v * s.v, 0, 'lowpass', 600, 150, 0.8, 0, o); },
  strike(x, z) { if (!this.ok()) return; const s = this.sp(x, z); for (let i = 0; i < 6; i++) this.tone(F1(500, 900), F1(300, 500), 0.12, 'triangle', 0.15 * s.v, s.p, 0.002, i * 0.04); },
  groan(c, v = 1) { if (!this.ok()) return; this.voice(c.x, c.z, 260 / c.scale, 180 / c.scale, 0.8, [[700, 5, 1], [1300, 6, 0.4]], 0.18 * v, 5); },
  hissS(x, z) { if (!this.ok()) return; const s = this.sp(x, z); this.burst(0.5, 0.25 * s.v, s.p, 'highpass', 4000, 3000, 1.2); },
  spray(x, z) { if (!this.ok()) return; const s = this.sp(x, z); this.burst(0.9, 0.45 * Math.max(0.3, s.v), s.p, 'bandpass', 2400, 800, 0.9); this.tone(90, 60, 0.6, 'sawtooth', 0.05 * s.v, s.p); },
  yowl(c, v = 1) { if (!this.ok()) return; this.voice(c.x, c.z, 520 / c.scale, 900 / c.scale, 0.35, [[1000, 5, 1], [2100, 6, 0.6]], 0.25 * v, 7); },
  gull(c) { if (!this.ok()) return; for (let i = 0; i < 3; i++) setTimeout(() => this.yelp(c, 0.8), i * 160); },
  bite(x, z) { if (!this.ok()) return; const s = this.sp(x, z); this.burst(0.06, 0.4 * s.v, s.p, 'bandpass', 2000, 900, 2); },
  bossSting() { if (!this.ok()) return; const o = this.out(1, 0); [[220, 0], [207, 0.25], [196, 0.5], [147, 0.75]].forEach(([f, d]) => { this.tone(f, f, 0.5, 'sawtooth', 0.08, 0, 0.01, d, o); this.tone(f / 2, f / 2, 0.5, 'square', 0.05, 0, 0.01, d, o); }); },
  binBang(x, z) { if (!this.ok()) return; const s = this.sp(x, z); const o = this.out(1, s.p); this.tone(140, 70, 0.5, 'sine', 0.6 * Math.max(0.4, s.v), 0, 0.003, 0, o); for (const [f, a] of [[230, 0.4], [520, 0.3], [910, 0.2]]) this.tone(f, f * 0.97, 0.6, 'triangle', a * Math.max(0.4, s.v), 0, 0.002, 0, o); this.burst(0.3, 0.4 * s.v, 0, 'lowpass', 1800, 300, 0.7, 0, o); },
  clank(x, z) { if (!this.ok()) return; this.clang(x, z, 0.4, 0.55); },
  fanfare() { if (!this.ok()) return; const o = this.out(1, 0); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.35, 'square', 0.06, 0, 0.005, i * 0.08, o)); },
  sting() { if (!this.ok()) return; const o = this.out(1, 0); [392, 370, 349].forEach((f, i) => this.tone(f, f, 0.3, 'sawtooth', 0.06, 0, 0.005, i * 0.15, o)); },
  alarm() { if (!this.ok()) return; const o = this.out(1, 0); for (let i = 0; i < 4; i++) this.tone(i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.18, 'square', 0.07, 0, 0.005, i * 0.2, o); },
  cheer() { if (!this.ok()) return; const o = this.out(1, 0); [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.6, 'triangle', 0.15, 0, 0.005, i * 0.09, o)); for (let i = 0; i < 10; i++) this.burst(0.08, 0.12, F1(-0.6, 0.6), 'highpass', 2500, 2500, 0.8, 0.3 + i * F1(0.04, 0.1)); },
  dawn() { if (!this.ok()) return; this.voice(0, 30, 600, 900, 0.25, [[1200, 5, 1]], 0.25, 0); setTimeout(() => this.voice(0, 30, 900, 1300, 0.7, [[1500, 5, 1], [2600, 6, 0.4]], 0.25, 8), 300); },
  sadTrombone() { if (!this.ok()) return; const o = this.out(1, 0); [[294, 0], [277, 0.45], [262, 0.9], [247, 1.35]].forEach(([f, d], i) => { const dur = i === 3 ? 1.3 : 0.45; const c = this.ctx, t = c.currentTime + d; const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(f, t); if (i === 3) { const l = c.createOscillator(); l.frequency.value = 6; const lg = c.createGain(); lg.gain.value = 6; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur); } const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1200; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); os.connect(fl); fl.connect(g); g.connect(o); os.start(t); os.stop(t + dur + 0.05); }); },
  rattle(on) { this.rattling = on; },
  crash(x, z, v) { if (!this.ok()) return; const s = this.sp(x, z); const o = this.out(1, s.p); const vol = Math.max(0.2, v * Math.max(0.4, s.v));
    this.burst(0.5, vol * 0.8, 0, 'lowpass', 2600, 300, 0.6, 0, o); for (let i = 0; i < 5; i++) this.tone(F1(1800, 4200), F1(1500, 3000), 0.12, 'triangle', vol * 0.08, 0, 0.002, i * F1(0.02, 0.06), o); this.tone(90, 40, 0.3, 'sine', vol * 0.6, 0, 0.003, 0, o); },
  carBy() { if (!this.ok()) return; this.burst(2.6, 0.12, 0, 'lowpass', 300, 900, 0.7); if (grng() < 0.25) setTimeout(() => this.honk(), 900); },
  nightStart() { if (!this.ok()) return; const o = this.out(1, 0); [196, 247, 294].forEach((f, i) => this.tone(f, f, 1.2, 'sine', 0.12, 0, 0.02, i * 0.12, o)); },
  ui() { if (!this.ctx) return; this.tone(900, 700, 0.06, 'triangle', 0.1, 0); },
  update(dt) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const c = GAME.cart; let rv = 0, rf = 3200;
    if (c && c.state === 'ridden' && GAME.mode !== 'paused') { const sp = Math.abs(c.v); rv = Math.min(1, sp / 8) * (c.hp < 40 ? 0.5 : 0.25) * (0.7 + Math.random() * 0.6); rf = c.hp < 40 ? 1800 + Math.random() * 1500 : 3200; }
    this.rat.g.gain.setTargetAtTime(rv, t, 0.03); this.rat.f.frequency.setTargetAtTime(rf, t, 0.03);
    // music gets busier when a boss is in or the den is under attack
    this.intense = GAME.facs && GAME.facs.some(f => f.bossC) || (GAME.den && GAME.den.raid > 0);
  },
  // ---- late-night alley jazz: walking bass, brushed ride, Rhodes on a minor ii-V-i ----
  jazzStart() {
    const ctx = this.ctx; this.jz = { next: ctx.currentTime + 0.3, step: 0 };
    const N = n => 440 * Math.pow(2, (n - 69) / 12);
    const chords = [[50, 53, 57, 60], [55, 59, 62, 65], [48, 51, 55, 58], [48, 51, 55, 58], [53, 56, 60, 63], [46, 50, 53, 57], [51, 55, 58, 62], [50, 54, 57, 60]];
    const roots = [38, 43, 36, 36, 41, 34, 39, 38];
    const spb = 60 / 96 / 2; // 8th notes, swung
    const out = ctx.createBiquadFilter(); out.type = 'lowpass'; out.frequency.value = 2600; out.connect(this.music);
    const ep = (f, t, dur, v) => { for (const [m, a] of [[1, 1], [2, 0.3], [3.98, 0.06]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * a, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); } };
    const tick = () => {
      if (!this.ctx) return;
      while (this.jz.next < ctx.currentTime + 0.25) {
        const s = this.jz.step, bar = Math.floor(s / 8) % 8, st = s % 8; const swing = st % 2 ? spb * 0.33 : 0; const t = this.jz.next + swing;
        if (this.music.gain.value > 0.001) {
          // walking bass on the beats
          if (st % 2 === 0) { const beat = st / 2; const r = roots[bar]; const walk = [0, 7, 10, 11][beat] + (beat === 3 ? (roots[(bar + 1) % 8] - r - 1) : 0); const f = N(r + (beat === 3 ? roots[(bar + 1) % 8] - r - 1 : [0, 3, 7, 5][beat])); const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.45); void walk; }
          // ride cymbal: ding, ding-a
          if (st % 2 === 0 || st === 3 || st === 7) { const sh = ctx.createBufferSource(); sh.buffer = this.noise; const hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 7500; hf.Q.value = 1.5; const hg = ctx.createGain(); hg.gain.setValueAtTime(st % 4 === 2 ? 0.05 : 0.03, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); sh.connect(hf); hf.connect(hg); hg.connect(out); sh.start(t, Math.random()); sh.stop(t + 0.32); }
          // brushed snare on 2 and 4 when it gets intense
          if (this.intense && (st === 2 || st === 6)) { const sh = ctx.createBufferSource(); sh.buffer = this.noise; const hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 2200; const hg = ctx.createGain(); hg.gain.setValueAtTime(0.06, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); sh.connect(hf); hf.connect(hg); hg.connect(out); sh.start(t, Math.random()); sh.stop(t + 0.2); }
          // Rhodes comping
          if (st === 1 || (st === 4 && bar % 2)) for (const n of chords[bar]) ep(N(n + 12), t, 0.9, 0.035);
          if (this.intense && st === 5) ep(N(chords[bar][3] + 24), t, 0.4, 0.04);
        }
        this.jz.next += spb; this.jz.step++;
      }
    };
    setInterval(tick, 60);
  }
};
