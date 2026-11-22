// Procedural WebAudio: pellet rifle, pumps, pops (delayed by the speed of sound), splashes,
// a quiet lake ambience with loons and a distant outboard.
const AUD = {
  ctx: null, master: null, on: true, noise: null, listener: [0, 0, 0],
  loonT: 12, pourGain: null, windGain: null, lapGain: null, motor: null,
};
AUD.init = function () {
  if (AUD.ctx || (TEST && !URLQ.has('audio'))) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    AUD.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    AUD.master = ctx.createGain(); AUD.master.gain.value = AUD.on ? 0.8 : 0;
    AUD.master.connect(comp);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AUD.noise = buf;
    // echo bus for the loons
    AUD.echo = ctx.createDelay(1.5); AUD.echo.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.33;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    AUD.echo.connect(lp); lp.connect(fb); fb.connect(AUD.echo); lp.connect(AUD.master);
    // ambience loops
    const mkLoop = (type, f, q, g) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const gn = ctx.createGain(); gn.gain.value = g;
      s.connect(fl); fl.connect(gn); gn.connect(AUD.master); s.start();
      return gn;
    };
    AUD.windGain = mkLoop('lowpass', 320, 0.7, 0.03);
    AUD.lapGain = mkLoop('bandpass', 520, 0.9, 0);
    AUD.pourGain = mkLoop('bandpass', 1100, 1.6, 0);
    // outboard motor (positional)
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 58;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 117;
    const mlp = ctx.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 380;
    const mg = ctx.createGain(); mg.gain.value = 0;
    const pan = AUD.panner([0, 0, 0], 20);
    o1.connect(mlp); o2.connect(mlp); mlp.connect(mg); mg.connect(pan);
    o1.start(); o2.start();
    AUD.motor = { gain: mg, pan, o1 };
    // two-stroke leaf blower: yours (close) and the nearest opponent's (positional)
    const mkBlower = (dest) => {
      const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 128;
      const b = ctx.createOscillator(); b.type = 'square'; b.frequency.value = 257;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(a.frequency);
      const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1400; nf.Q.value = 0.6;
      const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2200;
      const g = ctx.createGain(); g.gain.value = 0;
      const mixA = ctx.createGain(); mixA.gain.value = 0.35; const mixN = ctx.createGain(); mixN.gain.value = 0.9;
      a.connect(mixA); b.connect(mixA); mixA.connect(tone); n.connect(nf); nf.connect(mixN); mixN.connect(tone); tone.connect(g); g.connect(dest);
      a.start(); b.start(); lfo.start(); n.start();
      return { g, a, b };
    };
    AUD.blowMine = mkBlower(AUD.master);
    const bpan = AUD.panner([0, 0, 0], 14);
    AUD.blowFar = mkBlower(bpan); AUD.blowFar.pan = bpan;
  } catch (e) { logMsg('audio init failed', e.message); AUD.ctx = null; }
};
AUD.setOn = function (on) {
  AUD.on = on;
  if (AUD.master) AUD.master.gain.setTargetAtTime(on ? 0.8 : 0, AUD.ctx.currentTime, 0.05);
};
AUD.panner = function (p, ref) {
  const ctx = AUD.ctx, pn = ctx.createPanner();
  pn.panningModel = 'HRTF'; pn.distanceModel = 'inverse'; pn.refDistance = ref || 8; pn.rolloffFactor = 1.1; pn.maxDistance = 4000;
  if (pn.positionX) { pn.positionX.value = p[0]; pn.positionY.value = p[1]; pn.positionZ.value = p[2]; } else pn.setPosition(p[0], p[1], p[2]);
  pn.connect(AUD.master);
  return pn;
};
AUD.setListener = function (pos, fwd, up) {
  AUD.listener = pos;
  if (!AUD.ctx) return;
  const L = AUD.ctx.listener;
  if (L.positionX) {
    L.positionX.value = pos[0]; L.positionY.value = pos[1]; L.positionZ.value = pos[2];
    L.forwardX.value = fwd[0]; L.forwardY.value = fwd[1]; L.forwardZ.value = fwd[2];
    L.upX.value = up[0]; L.upY.value = up[1]; L.upZ.value = up[2];
  } else { L.setPosition(pos[0], pos[1], pos[2]); L.setOrientation(fwd[0], fwd[1], fwd[2], up[0], up[1], up[2]); }
};
// building blocks
AUD.noiseHit = function (dest, t, dur, type, f0, f1, q, gain, atk) {
  const ctx = AUD.ctx, s = ctx.createBufferSource();
  s.buffer = AUD.noise;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); fl.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + (atk || 0.002)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dest);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
};
AUD.tone = function (dest, t, dur, type, f0, f1, gain, atk) {
  const ctx = AUD.ctx, o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + (atk || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
};
AUD.at = function (p) {
  // returns [destination, start time] with the speed-of-sound delay
  const d = v3.dist(p, AUD.listener);
  return [AUD.panner(p, 8), AUD.ctx.currentTime + d / 343, d];
};
// ---- events ----
AUD.pop = function (p, r) {
  if (!AUD.ctx) return;
  const [dst, t, d] = AUD.at(p);
  const muffle = clamp(1 - d / 600, 0.25, 1);
  AUD.noiseHit(dst, t, 0.05, 'highpass', 900, 500, 0.7, 2.6, 0.001);
  AUD.noiseHit(dst, t, 0.12, 'lowpass', 3000 * muffle, 400, 0.8, 1.2, 0.001);
  AUD.tone(dst, t, 0.09, 'sine', 120, 45, 1.4);
};
AUD.shot = function (v) {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime, k = clamp(v / 235, 0.35, 1);
  AUD.noiseHit(AUD.master, t, 0.09, 'bandpass', 2200, 900, 0.8, 0.9 * k, 0.001);
  AUD.noiseHit(AUD.master, t, 0.012, 'highpass', 4000, 3000, 0.7, 0.9, 0.0005);
  AUD.tone(AUD.master, t, 0.05, 'sine', 190, 70, 0.7 * k);
  AUD.tone(AUD.master, t + 0.005, 0.12, 'sine', 2600, 2300, 0.05);
};
AUD.shotFar = function (p, v) {
  if (!AUD.ctx) return;
  const [dst, t] = AUD.at(p);
  AUD.noiseHit(dst, t, 0.08, 'bandpass', 1600, 700, 0.8, 1.4, 0.001);
  AUD.tone(dst, t, 0.04, 'sine', 170, 70, 0.6);
};
AUD.pumpOpen = function (n) {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime;
  AUD.noiseHit(AUD.master, t, 0.16, 'lowpass', 300, 1500, 0.9, 0.08, 0.05);
  AUD.noiseHit(AUD.master, t, 0.01, 'bandpass', 2500, 2500, 2, 0.12, 0.001);
};
AUD.pumpClose = function (n) {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime;
  AUD.noiseHit(AUD.master, t, 0.13, 'bandpass', 1400 + n * 160, 2600 + n * 200, 1.4, 0.14 + n * 0.01, 0.02);
  AUD.noiseHit(AUD.master, t + 0.12, 0.012, 'highpass', 2600, 2000, 0.7, 0.35, 0.001);
  AUD.tone(AUD.master, t + 0.12, 0.05, 'sine', 140, 80, 0.4);
};
AUD.boltOpen = function () {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime;
  AUD.noiseHit(AUD.master, t, 0.012, 'bandpass', 3400, 3000, 3, 0.35, 0.001);
  AUD.noiseHit(AUD.master, t + 0.09, 0.02, 'bandpass', 2200, 1800, 2, 0.25, 0.001);
};
AUD.boltClose = function () {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime;
  AUD.noiseHit(AUD.master, t, 0.015, 'bandpass', 2600, 2400, 3, 0.35, 0.001);
  AUD.noiseHit(AUD.master, t + 0.07, 0.012, 'bandpass', 3800, 3400, 3, 0.4, 0.001);
};
AUD.dry = function () {
  if (!AUD.ctx) return;
  AUD.noiseHit(AUD.master, AUD.ctx.currentTime, 0.01, 'bandpass', 3000, 3000, 4, 0.2, 0.001);
};
AUD.whiz = function (p, d) {
  if (!AUD.ctx) return;
  const dst = AUD.panner(p, 2), t = AUD.ctx.currentTime;
  AUD.noiseHit(dst, t, 0.16, 'bandpass', 4200, 1400, 6, 0.6 * clamp(2.5 / d, 0.3, 1), 0.02);
};
AUD.plink = function (p, metal) {
  if (!AUD.ctx) return;
  const [dst, t] = AUD.at(p);
  if (metal) { AUD.tone(dst, t, 0.3, 'sine', 2900, 2750, 0.5); AUD.tone(dst, t, 0.22, 'sine', 4300, 4100, 0.25); AUD.noiseHit(dst, t, 0.02, 'highpass', 3000, 2500, 0.7, 0.4, 0.001); }
  else { AUD.noiseHit(dst, t, 0.06, 'bandpass', 700, 400, 1.2, 1.0, 0.001); AUD.tone(dst, t + 0.03, 0.2, 'sine', 300, 600, 0.2); }
};
AUD.snip = function (p) {
  if (!AUD.ctx) return;
  const [dst, t] = AUD.at(p);
  AUD.tone(dst, t, 0.08, 'sine', 1100, 1900, 0.25);
};
AUD.splash = function (p, big) {
  if (!AUD.ctx) return;
  const [dst, t] = AUD.at(p);
  AUD.noiseHit(dst, t, 0.25 + big * 0.9, 'lowpass', 2400, 220, 0.7, 1.6 * big + 0.2, 0.004);
  for (let i = 0; i < 8 * big; i++) AUD.tone(dst, t + 0.1 + Math.random() * 0.6, 0.06, 'sine', 400 + Math.random() * 600, 900 + Math.random() * 900, 0.12);
};
AUD.squeak = function () {
  if (!AUD.ctx) return;
  const ctx = AUD.ctx, t = ctx.currentTime + 0.05 + Math.random() * 0.15;
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(800 + Math.random() * 300, t); o.frequency.linearRampToValueAtTime(1300 + Math.random() * 400, t + 0.16);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 32; const lg = ctx.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(AUD.master); o.start(t); lfo.start(t); o.stop(t + 0.25); lfo.stop(t + 0.25);
};
AUD.creak = function () {
  if (!AUD.ctx) return;
  const ctx = AUD.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(70 + Math.random() * 30, t); o.frequency.linearRampToValueAtTime(110 + Math.random() * 40, t + 0.5);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 5;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(f); f.connect(g); g.connect(AUD.master); o.start(t); o.stop(t + 0.7);
};
AUD.sputter = function () {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime;
  for (let i = 0; i < 4; i++) AUD.noiseHit(AUD.master, t + i * 0.09 + Math.random() * 0.03, 0.05, 'bandpass', 600, 300, 1.5, 0.25, 0.003);
};
AUD.tick = function (hi) {
  if (!AUD.ctx) return;
  AUD.tone(AUD.master, AUD.ctx.currentTime, 0.12, 'sine', hi ? 1320 : 880, hi ? 1320 : 880, 0.15);
};
AUD.go = function () {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime;
  AUD.tone(AUD.master, t, 0.35, 'sine', 1750, 2100, 0.18, 0.01);
};
AUD.loon = function () {
  const ctx = AUD.ctx, t = ctx.currentTime;
  const a = Math.random() * TAU, p = [Math.cos(a) * 600, 2, Math.sin(a) * 600];
  const dst = AUD.panner(p, 120);
  const o = ctx.createOscillator(); o.type = 'sine';
  const f0 = 480 + Math.random() * 80;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.linearRampToValueAtTime(f0 * 1.55, t + 0.9);
  o.frequency.linearRampToValueAtTime(f0 * 1.45, t + 2.0);
  o.frequency.linearRampToValueAtTime(f0 * 1.6, t + 2.6);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.4); g.gain.setValueAtTime(0.5, t + 2.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
  o.connect(g); g.connect(dst); g.connect(AUD.echo); o.start(t); lfo.start(t); o.stop(t + 3.1); lfo.stop(t + 3.1);
};
AUD.update = function (dt, st) {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime;
  AUD.loonT -= dt;
  if (AUD.loonT < 0) { AUD.loonT = 25 + Math.random() * 40; AUD.loon(); }
  AUD.windGain.gain.setTargetAtTime(0.02 + 0.03 * clamp(st.wind / 4, 0, 1), t, 0.5);
  AUD.lapGain.gain.setTargetAtTime(0.12 * smoothstep(40, 0, st.alt), t, 0.5);
  AUD.pourGain.gain.setTargetAtTime(st.pour ? 0.09 : 0, t, 0.06);
  if (AUD.blowMine) {
    const on = !!st.blow;
    AUD.blowMine.g.gain.setTargetAtTime(on ? 0.11 : 0, t, on ? 0.08 : 0.25);
    AUD.blowMine.a.frequency.setTargetAtTime(on ? 132 : 70, t, on ? 0.3 : 0.4);
    AUD.blowMine.b.frequency.setTargetAtTime(on ? 265 : 140, t, on ? 0.3 : 0.4);
    const far = st.blowFar;
    AUD.blowFar.g.gain.setTargetAtTime(far ? 0.6 : 0, t, 0.2);
    if (far && AUD.blowFar.pan.positionX) { AUD.blowFar.pan.positionX.value = far[0]; AUD.blowFar.pan.positionY.value = far[1]; AUD.blowFar.pan.positionZ.value = far[2]; }
  }
  if (AUD.motor) {
    AUD.motor.gain.gain.setTargetAtTime(st.motor ? 0.5 : 0, t, 0.4);
    if (st.motorPos) { const pn = AUD.motor.pan; if (pn.positionX) { pn.positionX.value = st.motorPos[0]; pn.positionY.value = 0.5; pn.positionZ.value = st.motorPos[2]; } }
    AUD.motor.o1.frequency.setTargetAtTime(56 + Math.sin(t * 0.7) * 3, t, 0.3);
  }
};
