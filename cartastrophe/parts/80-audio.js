// ---------- synthesized audio: rockets, rattling casters, crashes, screams, car alarms, store muzak ----------
const AUD = {
  ctx: null, voices: [],
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    let ctx; try { ctx = new AC(); } catch (e) { return; }
    this.ctx = ctx;
    this.master = ctx.createGain(); this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 6;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.connect(this.master);
    const len = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.apply();
    this.muzakStart();
  },
  apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(SET.sound ? 0.85 : 0, t, 0.05);
    this.music.gain.setTargetAtTime(SET.muzak ? (this.ducked ? 0.04 : 0.13) : 0, t, 0.2);
    if (!SET.voice && window.speechSynthesis) speechSynthesis.cancel();
  },
  duck(on) { this.ducked = on; this.apply(); },
  // spatialize relative to the camera
  sp(x, z) {
    if (x === undefined) return { v: 1, p: 0 };
    const dx = x - RND.cam[0], dz = z - RND.cam[2], d = Math.hypot(dx, dz) || 1;
    const v = RND.view; const pan = clamp((dx * v[0] + dz * v[8]) / d, -1, 1) * 0.75;
    return { v: 1 / (1 + d / 9), p: pan };
  },
  out(vol, pan) {
    const g = this.ctx.createGain(); g.gain.value = vol;
    if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.sfx); }
    else g.connect(this.sfx);
    return g;
  },
  tone(f0, f1, dur, type, vol, pan, attack = 0.005, delay = 0, dest) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.out(1, pan)); o.start(t); o.stop(t + dur + 0.05);
    return o;
  },
  burst(dur, vol, pan, type, f0, f1, Q = 1, delay = 0, dest) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = F1(0.8, 1.2);
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = Q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.out(1, pan)); s.start(t, F1(0, 1.5)); s.stop(t + dur + 0.05);
  },
  ok() { return this.ctx && SET.sound && this.ctx.state === 'running'; },
  // ---- per-cart engine voices ----
  voice(i) {
    if (this.voices[i]) return this.voices[i];
    const c = this.ctx; const v = {};
    v.src = c.createBufferSource(); v.src.buffer = this.noise; v.src.loop = true; v.src.playbackRate.value = 0.8 + i * 0.05;
    v.bp = c.createBiquadFilter(); v.bp.type = 'bandpass'; v.bp.frequency.value = 380; v.bp.Q.value = 0.8;
    v.rg = c.createGain(); v.rg.gain.value = 0;
    v.hp = c.createBiquadFilter(); v.hp.type = 'bandpass'; v.hp.frequency.value = 3800; v.hp.Q.value = 1.5;
    v.tg = c.createGain(); v.tg.gain.value = 0;
    v.osc = c.createOscillator(); v.osc.type = 'sawtooth'; v.osc.frequency.value = 48 + i * 3;
    v.lp = c.createBiquadFilter(); v.lp.type = 'lowpass'; v.lp.frequency.value = 180; v.og = c.createGain(); v.og.gain.value = 0;
    v.pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    v.src.connect(v.bp); v.bp.connect(v.rg); v.rg.connect(v.pan);
    v.src.connect(v.hp); v.hp.connect(v.tg); v.tg.connect(v.pan);
    v.osc.connect(v.lp); v.lp.connect(v.og); v.og.connect(v.pan);
    v.pan.connect(this.sfx); v.src.start(); v.osc.start();
    this.voices[i] = v; return v;
  },
  update(dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const c = GAME.carts[i];
      if (!c && !this.voices[i]) continue;
      const v = this.voice(i);
      let rock = 0, rat = 0, f = 380, pan = 0;
      if (c && c.state === 'drive' && GAME.mode !== 'paused') {
        const s = this.sp(c.x, c.z); const near = c === camTargetCart() ? 1.6 : 1;
        const th = c.thrustNow / THRUST;
        rock = Math.min(1.4, th) * 0.22 * s.v * near; f = 300 + th * 260 + (c.boosting ? 400 : 0) + Math.random() * 60;
        if (c.overT > 0) rock *= 0.3;
        const sp = c.speed(); rat = (c.onGround ? Math.min(1, sp / 12) : 0) * (0.05 + Math.random() * 0.09) * s.v * near;
        if (c.braking && sp > 1) rat *= 2.2;
        pan = s.p;
      }
      v.rg.gain.setTargetAtTime(rock, t, 0.04); v.og.gain.setTargetAtTime(rock * 0.9, t, 0.05);
      v.bp.frequency.setTargetAtTime(f, t, 0.05); v.tg.gain.setTargetAtTime(rat, t, 0.02);
      if (v.pan.pan) v.pan.pan.setTargetAtTime(pan, t, 0.05);
    }
  },
  // ---- one-shots ----
  clang(x, z, vol, pitch = 1) { if (!this.ok()) return; const s = this.sp(x, z); const v = vol * s.v; if (v < 0.01) return; const o = this.out(1, s.p);
    for (const [f, a] of [[520, 0.35], [1340, 0.22], [2210, 0.14], [3100, 0.08]]) this.tone(f * pitch * F1(0.95, 1.05), f * pitch * 0.98, 0.25 + a, 'triangle', v * a, 0, 0.002, 0, o);
    this.burst(0.06, v * 0.5, 0, 'highpass', 2500, 2500, 0.7, 0, o); },
  crash(x, z, vol) { if (!this.ok()) return; const s = this.sp(x, z); const v = Math.max(0.25, vol * s.v); const o = this.out(1, s.p);
    this.burst(0.7, v * 0.9, 0, 'lowpass', 2400, 300, 0.6, 0, o); this.tone(90, 38, 0.4, 'sine', v * 0.9, 0, 0.003, 0, o);
    for (const [f, a] of [[310, 0.4], [770, 0.3], [1250, 0.2], [2900, 0.1]]) this.tone(f * F1(0.9, 1.1), f * 0.9, 0.6 + a, 'triangle', v * a, 0, 0.002, 0, o);
    for (let i = 0; i < 6; i++) this.tone(F1(2500, 5000), F1(2000, 4000), 0.12, 'sine', v * 0.08, 0, 0.002, 0.08 + i * F1(0.03, 0.08), o); },
  splash(x, z, vol) { if (!this.ok()) return; const s = this.sp(x, z); const v = Math.max(0.3, vol * s.v); const o = this.out(1, s.p);
    this.burst(1.1, v * 0.9, 0, 'lowpass', 3500, 350, 0.7, 0, o); this.burst(0.25, v * 0.5, 0, 'bandpass', 900, 500, 1, 0, o);
    for (let i = 0; i < 8; i++) this.tone(F1(350, 700), F1(900, 1600), 0.08, 'sine', v * 0.12, 0, 0.005, 0.25 + i * F1(0.05, 0.12), o); },
  fall(x, z) { if (!this.ok()) return; const o = this.out(1, this.sp(x, z).p); const osc = this.tone(1500, 260, 2.3, 'sine', 0.16, 0, 0.05, 0, o); },
  scream(c) { if (!this.ok()) return; const s = this.sp(c.x, c.z); const ctx = this.ctx, t = ctx.currentTime; const v = Math.max(0.12, 0.45 * s.v);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; const f0 = 270 * c.rider.voice; o.frequency.setValueAtTime(f0 * 1.15, t); o.frequency.linearRampToValueAtTime(f0, t + 0.15); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 1.3);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = f0 * 0.05; lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.05); g.gain.setValueAtTime(v, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    const dest = this.out(1, s.p);
    for (const [ff, q, a] of [[800, 6, 1], [1200, 7, 0.7], [2600, 8, 0.3]]) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ff * (0.9 + c.rider.voice * 0.1); f.Q.value = q; const fg = ctx.createGain(); fg.gain.value = a; o.connect(f); f.connect(fg); fg.connect(g); }
    g.connect(dest); o.start(t); lfo.start(t); o.stop(t + 1.5); lfo.stop(t + 1.5); },
  alarm(car) { if (!this.ok()) return; const s = this.sp(car.x, car.z); const ctx = this.ctx, t = ctx.currentTime; const v = Math.max(0.05, 0.2 * s.v);
    const o = ctx.createOscillator(); o.type = 'square'; for (let k = 0; k < 14; k++) { o.frequency.setValueAtTime(k % 2 ? 900 : 620, t + k * 0.24); }
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + 3.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    o.connect(f); f.connect(g); g.connect(this.out(1, s.p)); o.start(t); o.stop(t + 3.5); },
  ding(x, z) { if (!this.ok()) return; const s = this.sp(x, z); const o = this.out(Math.max(0.25, s.v), s.p); this.tone(880, 880, 0.7, 'sine', 0.3, 0, 0.005, 0, o); this.tone(659, 659, 0.9, 'sine', 0.3, 0, 0.005, 0.32, o); },
  pa() { if (!this.ok()) return; const o = this.out(1, 0); [784, 659, 523].forEach((f, i) => this.tone(f, f, 0.9, 'sine', 0.18, 0, 0.01, i * 0.35, o)); this.say('Attention shoppers. Rocket cart demolition is now open in the parking lot.', true); },
  pickup(c) { if (!this.ok()) return; const s = c.isPlayer ? { v: 1, p: 0 } : this.sp(c.x, c.z); const o = this.out(s.v, s.p); [660, 880, 1175].forEach((f, i) => this.tone(f, f, 0.15, 'triangle', 0.25, 0, 0.004, i * 0.06, o)); },
  whoosh(c, v = 0.5) { if (!this.ok()) return; const s = this.sp(c.x, c.z); this.burst(0.35, v * s.v, s.p, 'bandpass', 500, 2400, 2); },
  plop(c) { if (!this.ok()) return; const s = this.sp(c.x, c.z); for (let i = 0; i < 3; i++) this.tone(420, 140, 0.12, 'sine', 0.3 * s.v, s.p, 0.003, i * 0.09); },
  blower(c) { if (!this.ok()) return; const s = this.sp(c.x, c.z); const o = this.out(1, s.p); this.burst(3.0, 0.32 * Math.max(0.3, s.v), 0, 'bandpass', 900, 700, 0.8, 0, o); this.tone(120, 140, 3.0, 'sawtooth', 0.06 * s.v, 0, 0.1, 0, o); },
  mega(c) { if (!this.ok()) return; const s = this.sp(c.x, c.z); const o = this.out(1, s.p); this.burst(2.2, 0.5 * Math.max(0.3, s.v), 0, 'lowpass', 600, 2200, 0.7, 0, o); this.tone(60, 110, 2.2, 'sawtooth', 0.2 * s.v, 0, 0.05, 0, o); },
  slip(c) { if (!this.ok()) return; const s = this.sp(c.x, c.z); this.tone(1100, 180, 0.5, 'sine', 0.3 * Math.max(0.3, s.v), s.p, 0.005); this.tone(2400, 1800, 0.25, 'square', 0.04 * s.v, s.p, 0.005, 0.05); },
  splat(x, z, v = 1) { if (!this.ok()) return; const s = this.sp(x, z); const o = this.out(1, s.p); this.burst(0.3, 0.7 * v * s.v, 0, 'lowpass', 900, 200, 0.8, 0, o); this.tone(140, 55, 0.25, 'sine', 0.6 * v * s.v, 0, 0.003, 0, o); },
  thunk(x, z, kind) { if (!this.ok()) return; const s = this.sp(x, z); this.tone(kind === 'box' ? 140 : 380, kind === 'box' ? 90 : 300, 0.15, 'triangle', 0.3 * s.v, s.p, 0.002); this.burst(0.08, 0.2 * s.v, s.p, 'lowpass', 700, 300, 0.8); },
  sputter(c) { if (!this.ok()) return; const s = this.sp(c.x, c.z); for (let i = 0; i < 6; i++) this.burst(0.07, 0.5 * s.v, s.p, 'lowpass', 600, 300, 0.7, i * F1(0.08, 0.16)); },
  pop(c) { if (!this.ok()) return; const s = this.sp(c.x, c.z); this.burst(0.06, 0.45 * s.v, s.p, 'lowpass', 900, 300, 0.7); },
  quack(d, loud) { if (!this.ok()) return; const s = this.sp(d.x, d.z); const o = this.out(1, s.p); const v = (loud ? 0.3 : 0.12) * s.v; if (v < 0.01) return;
    for (let i = 0; i < (loud ? 3 : 2); i++) { const ctx = this.ctx, t = ctx.currentTime + i * 0.17; const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(560, t); os.frequency.exponentialRampToValueAtTime(380, t + 0.12);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1150; f.Q.value = 3; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      os.connect(f); f.connect(g); g.connect(o); os.start(t); os.stop(t + 0.15); } },
  bong(x, z) { if (!this.ok()) return; const s = this.sp(x, z); const o = this.out(1, s.p); this.tone(196, 194, 1.8, 'sine', 0.4 * Math.max(0.3, s.v), 0, 0.003, 0, o); this.tone(523, 520, 1.2, 'sine', 0.15 * s.v, 0, 0.003, 0, o); },
  cheer() { if (!this.ok()) return; const o = this.out(1, 0); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.5, 'triangle', 0.18, 0, 0.005, i * 0.11, o)); },
  score() { if (!this.ok()) return; const o = this.out(1, 0); this.burst(0.05, 0.4, 0, 'highpass', 3000, 3000, 0.7, 0, o); [2093, 2637, 3136].forEach((f, i) => this.tone(f, f * 0.995, 0.7, 'sine', 0.13, 0, 0.002, 0.06 + i * 0.015, o)); },
  beep() { if (!this.ok()) return; this.tone(620, 620, 0.18, 'square', 0.12, 0); },
  go() { if (!this.ok()) return; this.tone(930, 930, 0.35, 'square', 0.14, 0); this.score(); },
  ui() { if (!this.ctx) return; this.tone(900, 700, 0.06, 'triangle', 0.12, 0); },
  say(text, force) {
    if (!SET.voice || !SET.sound || !window.speechSynthesis || TEST) return;
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/[!➜]/g, ' ').replace(/-/g, ' '));
      u.rate = force ? 1.0 : 1.12; u.pitch = force ? 1.0 : 1.25; u.volume = 0.9;
      const vs = speechSynthesis.getVoices(); const en = vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)); if (en) u.voice = en;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { }
  },
  // ---- bossa-nova supermarket muzak ----
  muzakStart() {
    const ctx = this.ctx; this.mz = { next: ctx.currentTime + 0.3, step: 0 };
    const N = n => 440 * Math.pow(2, (n - 69) / 12);
    const chords = [[53, 57, 60, 64], [50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 58], [53, 57, 60, 64], [50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 58, 61]];
    const bassR = [41, 38, 43, 36, 41, 38, 43, 36];
    const comp = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0];
    const mel = [72, 0, 69, 0, 0, 67, 0, 65, 0, 0, 64, 0, 65, 0, 67, 0];
    const spb = 60 / 112 / 4; // 16th notes
    const out = ctx.createBiquadFilter(); out.type = 'lowpass'; out.frequency.value = 3200; out.connect(this.music);
    const ep = (f, t, dur, v) => { for (const [m, a] of [[1, 1], [2, 0.25], [3.01, 0.08]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * a, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); } };
    const tick = () => {
      if (!this.ctx) return;
      while (this.mz.next < ctx.currentTime + 0.25) {
        const t = this.mz.next, s = this.mz.step, bar = Math.floor(s / 16) % 8, st = s % 16;
        if (this.music.gain.value > 0.001) {
          if (comp[st]) for (const n of chords[bar]) ep(N(n), t, 0.5, 0.05);
          if (st === 0 || st === 6 || st === 8 || st === 14) { const f = N(bassR[bar] + (st >= 8 ? 7 : 0)); const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4); }
          if (bar % 2 === 1 && mel[st]) ep(N(mel[st] + (bar === 3 || bar === 7 ? -2 : 0)), t, 0.6, 0.06);
          const sh = ctx.createBufferSource(); sh.buffer = this.noise; const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7000; const hg = ctx.createGain(); const acc = st % 4 === 2 ? 0.05 : 0.022;
          hg.gain.setValueAtTime(acc, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); sh.connect(hf); hf.connect(hg); hg.connect(out); sh.start(t, Math.random()); sh.stop(t + 0.06);
        }
        this.mz.next += spb; this.mz.step++;
      }
    };
    setInterval(tick, 60);
  }
};
