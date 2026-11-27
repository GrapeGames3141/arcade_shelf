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
  // ---- cat voice: a harmonic source through three moving formants, so the mouth shapes "m-e-a-ow" ----
  // spec: dur (s), gain, f0 / v1 / v2 / open / env as [fraction, value] points, vib (vibrato depth), rasp (growl depth), raspEnd (fraction), breath
  curve(pts, k, n = 48) {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = i / (n - 1); let j = 0; while (j < pts.length - 2 && u > pts[j + 1][0]) j++; const p = pts[j], q = pts[j + 1]; let w = clamp((u - p[0]) / Math.max(1e-6, q[0] - p[0]), 0, 1); w = w * w * (3 - 2 * w); a[i] = (p[1] + (q[1] - p[1]) * w) * k; }
    return a;
  },
  voice(c, dest, t, o) {
    if (!c._cat) {
      // source spectrum: every harmonic present, rolling off about 6 dB an octave, with a weakened fundamental (a strong one hoots instead of meowing)
      const N = 40, re = new Float32Array(N), im = new Float32Array(N); for (let h = 1; h < N; h++) im[h] = Math.pow(h, -0.95) * (h === 1 ? 0.55 : 1);
      const len = c.sampleRate, nb = c.createBuffer(1, len, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      c._cat = { wave: c.createPeriodicWave(re, im), noise: nb };
    }
    const dur = o.dur, end = t + dur, K = c._cat;
    const out = c.createGain(); out.gain.setValueCurveAtTime(this.curve(o.env, o.gain), t, dur); out.gain.setValueAtTime(0, end + 0.01); out.connect(dest);
    const mouth = c.createBiquadFilter(); mouth.type = 'lowpass'; mouth.Q.value = 0.6; mouth.frequency.setValueCurveAtTime(this.curve(o.open, 1), t, dur); mouth.connect(out);
    const osc = c.createOscillator(); osc.setPeriodicWave(K.wave); osc.frequency.setValueCurveAtTime(this.curve(o.f0, o.pitch || 1), t, dur);
    // vibrato fades in over the second half, the way a held note wobbles
    const vib = c.createOscillator(); vib.frequency.value = 5.6 + Math.random() * 1.2; const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(0, t + dur * 0.35); vg.gain.linearRampToValueAtTime((o.vib || 0.012) * 600, t + dur * 0.7); vib.connect(vg); vg.connect(osc.frequency);
    // tiny random pitch wander so it is not a perfect machine tone
    const jit = c.createBufferSource(); jit.buffer = K.noise; jit.loop = true; const jf = c.createBiquadFilter(); jf.type = 'lowpass'; jf.frequency.value = 18; const jg = c.createGain(); jg.gain.value = 22; jit.connect(jf); jf.connect(jg); jg.connect(osc.frequency);
    // rasp: a 30 Hz flutter on the level for the "mrrr" of a demanding meow
    const am = c.createGain(); am.gain.value = 1; osc.connect(am);
    let rl = null; if (o.rasp) { rl = c.createOscillator(); rl.type = 'triangle'; rl.frequency.value = 27 + Math.random() * 6; const rg = c.createGain(); rg.gain.setValueAtTime(o.rasp, t); rg.gain.setValueAtTime(o.rasp, t + dur * (o.raspEnd || 0.3) * 0.7); rg.gain.linearRampToValueAtTime(0, t + dur * (o.raspEnd || 0.3)); rl.connect(rg); rg.connect(am.gain); rl.start(t); rl.stop(end + 0.05); }
    for (const [pts, q, g] of [[o.v1, 5, 1.0], [o.v2, 8, 1.5], [o.v3 || [[0, 3900], [1, 3600]], 9, 0.5]]) {
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueCurveAtTime(this.curve(pts, 1), t, dur); const fg = c.createGain(); fg.gain.value = g; am.connect(f); f.connect(fg); fg.connect(mouth);
    }
    const body = c.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 950; const bg = c.createGain(); bg.gain.value = 0.2; am.connect(body); body.connect(bg); bg.connect(mouth);
    const br = c.createBufferSource(); br.buffer = K.noise; br.loop = true; const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 2600; bf.Q.value = 0.7; const bn = c.createGain(); bn.gain.value = o.breath === undefined ? 0.05 : o.breath; br.connect(bf); bf.connect(bn); bn.connect(mouth);
    for (const n of [osc, vib, jit, br]) { n.start(t, n === jit || n === br ? Math.random() * 0.5 : undefined); n.stop(end + 0.05); }
  },
  meowSpec(n) {
    const r = (a, b) => a + (b - a) * Math.random(), pitch = r(0.95, 1.06);
    const env = [[0, 0], [0.09, 0.55], [0.32, 1], [0.62, 0.86], [0.88, 0.3], [1, 0]], open = [[0, 650], [0.14, 2600], [0.34, 7000], [0.7, 4800], [1, 1100]];
    if (n === 1) return { dur: r(0.36, 0.44), gain: 0.58, pitch, env, open, breath: 0.04,           // a polite, rising "mew?"
      f0: [[0, 560], [0.28, 790], [0.6, 760], [1, 650]], v1: [[0, 450], [0.2, 720], [0.6, 1000], [1, 700]], v2: [[0, 1700], [0.2, 3100], [0.6, 2500], [1, 1600]] };
    if (n === 2) return { dur: r(0.6, 0.72), gain: 0.84, pitch, env, open,                          // the standard "meow"
      f0: [[0, 470], [0.18, 710], [0.42, 695], [0.76, 545], [1, 430]], v1: [[0, 400], [0.15, 700], [0.45, 1280], [0.76, 820], [1, 540]], v2: [[0, 1500], [0.15, 3050], [0.45, 2150], [0.76, 1400], [1, 980]] };
    return { dur: r(1.05, 1.25), gain: 0.8, pitch: pitch * 0.97, open, breath: 0.07, vib: 0.03, rasp: 0.55, raspEnd: 0.34,   // "MRRROWWW": growled start, long falling wail
      env: [[0, 0], [0.08, 0.6], [0.36, 1], [0.72, 0.92], [0.9, 0.4], [1, 0]],
      f0: [[0, 320], [0.16, 420], [0.34, 660], [0.52, 640], [0.82, 480], [1, 335]], v1: [[0, 400], [0.26, 650], [0.46, 1320], [0.76, 880], [1, 500]], v2: [[0, 1300], [0.26, 2500], [0.46, 2050], [0.76, 1350], [1, 940]] };
  },
  meow(n) { if (!this.ctx) return; this.voice(this.ctx, this.sfx, this.ctx.currentTime + 0.005, this.meowSpec(n)); },
  // the short protest when picked up or caught
  mrow() {
    if (!this.ctx) return;
    this.voice(this.ctx, this.sfx, this.ctx.currentTime + 0.005, { dur: 0.44, gain: 0.6, pitch: 0.96 + Math.random() * 0.1, rasp: 0.4, raspEnd: 0.6, breath: 0.07,
      env: [[0, 0], [0.1, 0.9], [0.4, 1], [0.8, 0.5], [1, 0]], open: [[0, 1800], [0.2, 6500], [0.7, 4000], [1, 1200]],
      f0: [[0, 610], [0.25, 720], [0.6, 560], [1, 390]], v1: [[0, 800], [0.3, 1250], [0.7, 850], [1, 550]], v2: [[0, 2400], [0.3, 2050], [0.7, 1400], [1, 1000]] });
  },
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
