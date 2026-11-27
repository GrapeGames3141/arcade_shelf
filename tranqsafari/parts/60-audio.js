// ===== Procedural audio: engine, wind, river, rifle, creature calls, radio squelch, music; optional spoken radio =====
const AUD = { ctx: null, on: SAVE.get('sound', true), music: SAVE.get('music', true), voice: SAVE.get('voice', false), master: null, sfx: null, mus: null, beds: {}, noise: null, nextBeat: 0, beat: 0 };
function audioInit() {
  if (AUD.ctx || TEST) return;
  try { AUD.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const c = AUD.ctx;
  AUD.master = c.createGain(); AUD.master.gain.value = AUD.on ? 0.8 : 0;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; AUD.master.connect(comp); comp.connect(c.destination);
  AUD.sfx = c.createGain(); AUD.sfx.connect(AUD.master); AUD.mus = c.createGain(); AUD.mus.gain.value = AUD.music ? 0.22 : 0; AUD.mus.connect(AUD.master);
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; AUD.noise = buf;
  // beds: engine (two detuned saws through lowpass), wind, river
  const eng = c.createGain(); eng.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; eng.connect(AUD.sfx); lp.connect(eng);
  const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 40; const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 80.5;
  const g2 = c.createGain(); g2.gain.value = 0.35; o1.connect(lp); o2.connect(g2); g2.connect(lp); o1.start(); o2.start();
  AUD.beds.eng = { g: eng, lp, o1, o2 };
  for (const [k, type, f, q] of [['wind', 'bandpass', 700, 0.6], ['river', 'lowpass', 900, 0.7]]) {
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0;
    src.connect(fl); fl.connect(g); g.connect(AUD.sfx); src.start(); AUD.beds[k] = { g, fl };
  }
}
function audioSet() { if (!AUD.ctx) return; AUD.master.gain.setTargetAtTime(AUD.on ? 0.8 : 0, AUD.ctx.currentTime, 0.05); AUD.mus.gain.setTargetAtTime(AUD.music ? 0.22 : 0, AUD.ctx.currentTime, 0.1); }
function now() { return AUD.ctx ? AUD.ctx.currentTime : 0; }
function env(g, t, a, peak, d, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
function tone(type, f0, f1, dur, vol, opt = {}) {
  if (!AUD.ctx) return; const c = AUD.ctx, t = c.currentTime + (opt.delay || 0);
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  const g = c.createGain(); env(g, t, opt.a || 0.005, vol, dur);
  let node = o; if (opt.filter) { const f = c.createBiquadFilter(); f.type = opt.filter; f.frequency.value = opt.ff || 1000; f.Q.value = opt.q || 1; o.connect(f); node = f; }
  if (opt.vib) { const l = c.createOscillator(); l.frequency.value = opt.vib; const lg = c.createGain(); lg.gain.value = opt.vibA || f0 * 0.03; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
  node.connect(g); g.connect(opt.out || AUD.sfx); o.start(t); o.stop(t + dur + 0.05);
}
function noiseHit(dur, vol, type, f, q = 1, opt = {}) {
  if (!AUD.ctx) return; const c = AUD.ctx, t = c.currentTime + (opt.delay || 0);
  const s = c.createBufferSource(); s.buffer = AUD.noise; s.playbackRate.value = opt.rate || 1; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (opt.f1) fl.frequency.exponentialRampToValueAtTime(opt.f1, t + dur); fl.Q.value = q;
  const g = c.createGain(); env(g, t, opt.a || 0.003, vol, dur); s.connect(fl); fl.connect(g); g.connect(opt.out || AUD.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function distVol(a, base = 1) { if (!a || !a.pos) return base; const d = V.dist(a.pos, CAM.pos); return base * clamp(1.6 - d / 45, 0.12, 1.2); }
const SFX = {
  fire() { noiseHit(0.09, 0.5, 'bandpass', 1800, 0.8, { f1: 600 }); tone('sine', 140, 55, 0.12, 0.45); tone('square', 2400, 2400, 0.02, 0.05, { delay: 0.09 }); },
  empty() { tone('square', 1800, 1800, 0.02, 0.08); noiseHit(0.03, 0.15, 'highpass', 3000); },
  reload() { noiseHit(0.05, 0.2, 'bandpass', 2500, 2, { delay: 0.05 }); noiseHit(0.12, 0.15, 'bandpass', 1200, 1, { delay: 0.45 }); tone('square', 900, 700, 0.03, 0.06, { delay: 0.48 }); },
  reloadDone() { noiseHit(0.04, 0.25, 'bandpass', 3000, 2); tone('square', 1400, 1400, 0.025, 0.08, { delay: 0.05 }); },
  thwip(weak) { noiseHit(0.06, 0.25, 'highpass', 2500); if (weak) tone('triangle', 1300, 1900, 0.12, 0.14); },
  wood() { tone('triangle', 320, 180, 0.12, 0.3); noiseHit(0.05, 0.2, 'bandpass', 900, 2); },
  thud(v = 1) { tone('sine', 90, 40, 0.25, 0.5 * v); noiseHit(0.12, 0.25 * v, 'lowpass', 400); },
  stomp(v = 1) { tone('sine', 55, 28, 0.45, 0.9 * v); noiseHit(0.2, 0.35 * v, 'lowpass', 220); },
  splash(v = 1) { noiseHit(0.9 * v, 0.6 * v, 'lowpass', 2500, 0.7, { f1: 400 }); },
  hurt() { noiseHit(0.25, 0.55, 'lowpass', 1600, 0.8, { f1: 300 }); tone('square', 160, 70, 0.25, 0.2); },
  crunch() { noiseHit(0.8, 0.7, 'lowpass', 900, 1, { f1: 150 }); tone('sawtooth', 70, 35, 0.8, 0.3); },
  chomp() { noiseHit(0.08, 0.6, 'bandpass', 600, 1.5); tone('square', 120, 50, 0.15, 0.4); noiseHit(0.5, 0.5, 'lowpass', 1200, 1, { delay: 0.05, f1: 200 }); },
  squelch() { noiseHit(0.12, 0.12, 'bandpass', 2200, 3); tone('square', 1100, 1100, 0.04, 0.03, { delay: 0.1 }); },
  raptor(a, p = 1) { const v = distVol(a, 0.35); tone('sawtooth', 700 * p, 1500 * p, 0.12, v, { filter: 'bandpass', ff: 1800, q: 3 }); tone('sawtooth', 1500 * p, 650 * p, 0.25, v, { filter: 'bandpass', ff: 1500, q: 2, delay: 0.12, vib: 38, vibA: 90 }); },
  ptero(a, p = 1) { const v = distVol(a, 0.3); tone('square', 1900 * p, 1100 * p, 0.35, v * 0.5, { filter: 'bandpass', ff: 2200, q: 4, vib: 25, vibA: 120 }); },
  bellow(a) { const v = distVol(a, 0.45); tone('sawtooth', 120, 75, 0.7, v, { filter: 'lowpass', ff: 500, vib: 9, vibA: 6 }); },
  longneck(a) { const v = distVol(a, 0.5); tone('sine', 95, 70, 2.2, v, { a: 0.3, vib: 4, vibA: 3 }); tone('triangle', 190, 140, 2.0, v * 0.3, { a: 0.4 }); },
  roar(v = 1) { noiseHit(1.8 * v, 0.9 * v, 'lowpass', 900, 1.2, { a: 0.08, f1: 250, rate: 0.6 }); tone('sawtooth', 75, 42, 1.7 * v, 0.55 * v, { a: 0.1, filter: 'lowpass', ff: 600, vib: 13, vibA: 9 }); },
  yelp(a, p = 1) {
    if (!a) return; const k = a.sp.id; const v = distVol(a, 0.25);
    if (k === 'raptor') tone('sawtooth', 1200 * p, 600 * p, 0.18, v, { filter: 'bandpass', ff: 1400, q: 2 });
    else if (k === 'ptero') tone('square', 1600, 900, 0.2, v * 0.5, { filter: 'bandpass', ff: 1800, q: 3 });
    else if (k === 'runner') tone('triangle', 800 * p, 500 * p, 0.2, v);
    else if (k === 'hornback') tone('sawtooth', 160 * p, 100 * p, 0.35, v * 1.2, { filter: 'lowpass', ff: 600 });
    else if (k === 'longneck') SFX.longneck(a);
    else if (k === 'boss' || k === 'sailback') noiseHit(0.5, 0.4, 'lowpass', 700, 1, { f1: 250, rate: 0.7 });
    else if (k === 'nipper') tone('sawtooth', 2100 * p, 1300 * p, 0.1, v * 0.8, { filter: 'bandpass', ff: 2400, q: 2 });
    else if (k === 'clubtail') tone('sawtooth', 120 * p, 80 * p, 0.4, v * 1.2, { filter: 'lowpass', ff: 500 });
  },
  snore(a) { const v = distVol(a, 0.12); noiseHit(1.1, v, 'lowpass', a.sp.boss ? 300 : 700, 1, { a: 0.4 }); },
  ui() { tone('triangle', 900, 1200, 0.06, 0.12); },
  plink() { tone('triangle', 2100, 1500, 0.07, 0.18); tone('sine', 3300, 2900, 0.05, 0.1, { delay: 0.01 }); noiseHit(0.03, 0.12, 'highpass', 4000); },
  plop() { tone('sine', 420, 160, 0.12, 0.2); noiseHit(0.1, 0.12, 'lowpass', 1200); },
  cricket(v = 1) { for (let i = 0; i < 3; i++) tone('sine', 4300 + Math.random() * 500, 4300, 0.035, 0.035 * v, { delay: i * 0.07 }); },
  frog(v = 1) { tone('sawtooth', 150 + Math.random() * 60, 110, 0.16, 0.06 * v, { filter: 'bandpass', ff: 500, q: 4, vib: 28, vibA: 20 }); },
};
function audioUpdate(dt) {
  if (!AUD.ctx) return; const t = AUD.ctx.currentTime, J = JEEP; const playing = G.phase === 'play' || G.phase === 'over';
  const b = AUD.beds; const sp = playing ? J.v : 0;
  b.eng.g.gain.setTargetAtTime(playing ? 0.09 + sp * 0.006 : 0, t, 0.2); b.eng.o1.frequency.setTargetAtTime(38 + sp * 3.2 + J.bump * 2, t, 0.15); b.eng.o2.frequency.setTargetAtTime(77 + sp * 6.4, t, 0.15); b.eng.lp.frequency.setTargetAtTime(220 + sp * 30, t, 0.2);
  b.wind.g.gain.setTargetAtTime(playing ? 0.015 + sp * 0.004 : 0, t, 0.3);
  const sec = secAt(J.s); const riv = playing ? Math.max(sec.river, sec.sea * 0.5) : 0; b.river.g.gain.setTargetAtTime(riv * 0.09, t, 0.5);
  // dusk and night: crickets, frogs in the mire, a low rumble over the lava
  if (playing && LIGHT.lamp > 0.05) { AUD.night = (AUD.night ?? 1) - dt; if (AUD.night <= 0) { AUD.night = 0.25 + Math.random() * 0.7; if (sec.lava < 0.5) SFX.cricket(Math.min(1, LIGHT.lamp * 2)); if (sec.marsh > 0.5 && Math.random() < 0.4) SFX.frog(1); if (sec.lava > 0.5 && Math.random() < 0.3) noiseHit(1.2, 0.07, 'lowpass', 120, 1, { a: 0.4 }); } }
  // snoring sleepers nearby
  if (playing) for (const a of ACTORS) if (a.asleep && a.an.sleep >= 1) { a.snoreT = (a.snoreT ?? Math.random() * 3) - dt; if (a.snoreT <= 0) { a.snoreT = 2.6 + Math.random(); if (V.dist(a.pos, CAM.pos) < 40) SFX.snore(a); } }
  // music: marimba ostinato, faster with drums during the chase
  if (!AUD.music || !playing) return;
  const chase = BOSS.a && !BOSS.a.asleep; const bpm = chase ? 138 : 104; const step = 60 / bpm / 2;
  if (AUD.nextBeat < t) AUD.nextBeat = t + 0.05;
  while (AUD.nextBeat < t + 0.2) {
    const i = AUD.beat++ % 16; const bt = AUD.nextBeat - t;
    const scale = [0, 3, 5, 7, 10, 12, 15]; const root = (chase ? 110 : 146.8) * (LIGHT.night > 0.5 ? 0.75 : 1); const pat = chase ? [0, 0, 3, 0, 5, 0, 3, 4, 0, 0, 3, 0, 6, 5, 3, 2] : [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 2, 1];
    if (i % 2 === 0 || chase) tone('triangle', root * Math.pow(2, scale[pat[i]] / 12) * 2, root * Math.pow(2, scale[pat[i]] / 12) * 2, 0.18, 0.12, { delay: bt, out: AUD.mus });
    if (i % 4 === 0) tone('sine', root / 2, root / 2.2, 0.3, chase ? 0.35 : 0.2, { delay: bt, out: AUD.mus });
    if (chase && i % 4 === 2) noiseHit(0.12, 0.25, 'bandpass', 180, 1, { delay: bt, out: AUD.mus });
    noiseHit(0.03, chase ? 0.08 : 0.04, 'highpass', 7000, 1, { delay: bt, out: AUD.mus });
    AUD.nextBeat += step;
  }
}
function speak(m) {
  if (!AUD.voice || !AUD.on || TEST || !('speechSynthesis' in window)) return;
  try { const u = new SpeechSynthesisUtterance(m.text); const s = SPEAKERS[m.who]; u.pitch = s.pitch; u.rate = s.rate; u.volume = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { }
}
