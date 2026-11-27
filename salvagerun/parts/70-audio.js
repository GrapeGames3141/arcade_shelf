// ---------- procedural audio: effects, music, optional radio voice ----------
const AU = { ctx: null };
AU.init = function () {
  if (AU.ctx || TEST) return;
  try {
    const C = new (window.AudioContext || window.webkitAudioContext)(); AU.ctx = C;
    AU.comp = C.createDynamicsCompressor(); AU.comp.threshold.value = -14; AU.comp.ratio.value = 4; AU.comp.connect(C.destination);
    AU.master = C.createGain(); AU.master.gain.value = SET.sound ? 0.8 : 0; AU.master.connect(AU.comp);
    AU.sfx = C.createGain(); AU.sfx.gain.value = 0.9; AU.sfx.connect(AU.master);
    AU.mus = C.createGain(); AU.mus.gain.value = SET.music ? 0.32 : 0; AU.mus.connect(AU.master);
    const n = C.createBuffer(1, C.sampleRate * 2, C.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; AU.noise = n;
    MUSIC.start();
  } catch (e) { AU.ctx = null; }
};
AU.apply = function () { if (!AU.ctx) return; AU.master.gain.value = SET.sound ? 0.8 : 0; AU.mus.gain.value = SET.music ? 0.32 : 0; if (AU.ctx.state === 'suspended') AU.ctx.resume(); };
function tone(f, dur, type = 'sine', vol = 0.2, f2 = null, when = 0, bus = null, att = 0.004) {
  const C = AU.ctx; if (!C) return; const t = C.currentTime + when;
  const o = C.createOscillator(), g = C.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus || AU.sfx); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.2, ftype = 'lowpass', f0 = 2000, f1 = null, q = 1, when = 0, bus = null, att = 0.003) {
  const C = AU.ctx; if (!C) return; const t = C.currentTime + when;
  const s = C.createBufferSource(); s.buffer = AU.noise; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = C.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); f.Q.value = q;
  const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || AU.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
let SFX_LAST = {};
function rateOk(k, gap) { const t = AU.ctx ? AU.ctx.currentTime : 0; if (SFX_LAST[k] && t - SFX_LAST[k] < gap) return false; SFX_LAST[k] = t; return true; }
const SFX = {
  fire() { if (!AU.ctx) return; const p = 1 + (Math.random() - 0.5) * 0.12; tone(1100 * p, 0.07, 'square', 0.045, 260 * p); noise(0.05, 0.05, 'highpass', 3000, null, 0.7); },
  lockOn() { tone(420, 0.12, 'sine', 0.06, 640); },
  lock(n) { tone(560 + n * 95, 0.09, 'triangle', 0.12); tone(1120 + n * 190, 0.06, 'sine', 0.05, null, 0.01); },
  launch() { if (!rateOk('launch', 0.03)) return; noise(0.22, 0.09, 'bandpass', 700, 2600, 2); tone(300, 0.18, 'sawtooth', 0.025, 900); },
  pop() { if (!rateOk('pop', 0.025)) return; noise(0.25, 0.16, 'lowpass', 1800, 120, 1); tone(140, 0.2, 'sine', 0.12, 50); },
  boom(sz = 3) { if (!rateOk('boom', 0.04)) return; const k = clamp(sz / 10, 0.15, 1.6); noise(0.35 + k * 0.6, 0.18 + k * 0.12, 'lowpass', 1400, 70, 0.8); tone(90, 0.3 + k * 0.4, 'sine', 0.14 + k * 0.1, 30); },
  clang(sz = 3) { if (!rateOk('clang', 0.04)) return; const b = 300 + Math.random() * 120; for (const r of [1, 2.76, 5.4]) tone(b * r, 0.35 + Math.random() * 0.2, 'triangle', 0.035, b * r * 0.97); noise(0.3, 0.12, 'lowpass', 2200, 200, 1); tone(90, 0.25, 'sine', 0.1, 40); },
  shatter(sz = 3) { if (!rateOk('shatter', 0.04)) return; noise(0.4, 0.12, 'highpass', 5000, 2500, 0.7); for (let i = 0; i < 5; i++) tone(2000 + Math.random() * 3500, 0.12 + Math.random() * 0.2, 'sine', 0.03, null, Math.random() * 0.15); tone(120, 0.2, 'sine', 0.08, 50); },
  squish() { if (!rateOk('squish', 0.04)) return; noise(0.2, 0.12, 'lowpass', 900, 200, 4); tone(260, 0.18, 'sine', 0.08, 90); },
  pickup() { if (!rateOk('pick', 0.035)) return; const b = 1318 * (1 + Math.random() * 0.06); tone(b, 0.08, 'sine', 0.06); tone(b * 1.5, 0.12, 'sine', 0.05, null, 0.05); },
  hullHit(d) { noise(0.5, 0.25, 'lowpass', 800, 60, 1); tone(70, 0.4, 'sine', 0.22, 35); for (const r of [1, 1.9]) tone(180 * r, 0.6, 'triangle', 0.04, 160 * r); if (TUG.hull < 30) { tone(880, 0.15, 'square', 0.05, null, 0.1); tone(660, 0.15, 'square', 0.05, null, 0.3); } },
  radio() { noise(0.18, 0.06, 'bandpass', 2500, 1200, 3); tone(1400, 0.06, 'square', 0.025, null, 0.05); },
  roar(k = 1) { if (!AU.ctx) return; for (const f of [55, 82, 61]) tone(f * (0.9 + Math.random() * 0.2), 1.4 * k + 0.4, 'sawtooth', 0.07 * k, f * 0.6, 0, null, 0.15); noise(1.3 * k + 0.3, 0.14 * k, 'lowpass', 500, 120, 3, 0, null, 0.1); },
  warn() { tone(740, 0.12, 'square', 0.05); tone(560, 0.16, 'square', 0.05, null, 0.14); },
  whoosh() { noise(0.6, 0.14, 'bandpass', 300, 1800, 1.5); },
  chomp() { noise(0.4, 0.3, 'lowpass', 600, 80, 2); tone(60, 0.5, 'sine', 0.3, 25); },
  spit() { noise(0.2, 0.1, 'bandpass', 1200, 400, 3); tone(400, 0.15, 'sine', 0.06, 150); },
  chitter() { for (let i = 0; i < 10; i++) noise(0.03, 0.06, 'bandpass', 3500 + Math.random() * 2000, null, 6, i * 0.04); },
  repair() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, null, i * 0.07)); },
  fanfare() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'square', 0.04, null, i * 0.06)); },
  // campaign weapons and gear
  zap() { if (!rateOk('zap', 0.08)) return; tone(1800, 0.12, 'sawtooth', 0.025, 500); },
  mode() { tone(660, 0.06, 'square', 0.05); tone(990, 0.08, 'square', 0.04, null, 0.06); },
  scatter() { if (!AU.ctx || !rateOk('scatter', 0.05)) return; noise(0.16, 0.13, 'lowpass', 2600, 300, 0.8); tone(160, 0.14, 'square', 0.06, 60); },
  flak() { if (!AU.ctx || !rateOk('flak', 0.05)) return; noise(0.12, 0.08, 'bandpass', 900, 400, 1.5); tone(240, 0.12, 'square', 0.05, 90); },
  flakPop() { if (!rateOk('flakPop', 0.03)) return; noise(0.22, 0.11, 'lowpass', 1600, 150, 1); },
  overheat() { noise(0.6, 0.12, 'highpass', 4000, 1500, 0.8); tone(420, 0.5, 'square', 0.05, 140); },
  shield() { tone(880, 0.3, 'sine', 0.1, 1760); noise(0.25, 0.08, 'highpass', 5000, 2000, 1); },
  shieldUp() { [784, 988, 1175].forEach((f, i) => tone(f, 0.18, 'sine', 0.05, null, i * 0.06)); },
  buy() { tone(1046, 0.08, 'square', 0.05); tone(1568, 0.16, 'square', 0.05, null, 0.07); noise(0.05, 0.05, 'highpass', 6000, null, 1, 0.07); },
  beam(on) { // a held hum while the cutting beam fires
    const C = AU.ctx; if (!C) return;
    if (on && !AU.beam) {
      const o = C.createOscillator(), o2 = C.createOscillator(), g = C.createGain(), f = C.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = 110; o2.type = 'square'; o2.frequency.value = 221; f.type = 'lowpass'; f.frequency.value = 1400; f.Q.value = 4;
      g.gain.setValueAtTime(0.0001, C.currentTime); g.gain.exponentialRampToValueAtTime(0.05, C.currentTime + 0.05);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(AU.sfx); o.start(); o2.start(); AU.beam = { o, o2, g, f };
    } else if (!on && AU.beam) {
      const b = AU.beam; AU.beam = null; const t = C.currentTime; b.g.gain.cancelScheduledValues(t); b.g.gain.setValueAtTime(Math.max(0.0001, b.g.gain.value), t); b.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); b.o.stop(t + 0.1); b.o2.stop(t + 0.1);
    }
    if (AU.beam) { const h = WEAP.heat || 0; AU.beam.f.frequency.value = 900 + h * 2600; AU.beam.o.frequency.value = 110 + h * 50; }
  }
};
// ---- music: a small step sequencer ----
const MUSIC = { mode: 'cruise', step: 0, next: 0, timer: null };
const CHORDS = { cruise: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], boss: [[57, 60, 64], [58, 62, 65], [57, 60, 64], [56, 59, 63]], menu: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
MUSIC.setMode = m => { MUSIC.mode = m; };
MUSIC.start = function () {
  if (MUSIC.timer || !AU.ctx) return; MUSIC.next = AU.ctx.currentTime + 0.1;
  MUSIC.timer = setInterval(() => {
    const C = AU.ctx; if (!C || !SET.music) { if (C) MUSIC.next = C.currentTime + 0.1; return; }
    const bpm = MUSIC.mode === 'boss' ? 134 : MUSIC.mode === 'menu' ? 92 : 104 + zoneAt(TUG.s) * 4, sx = 60 / bpm / 4;
    while (MUSIC.next < C.currentTime + 0.15) { MUSIC.play(MUSIC.step, MUSIC.next - C.currentTime, sx); MUSIC.step++; MUSIC.next += sx; }
  }, 30);
};
MUSIC.play = function (s, w, sx) {
  const mode = G.phase === 'play' ? MUSIC.mode : 'menu', ch = CHORDS[mode][Math.floor(s / 16) % 4], b = s % 16, z = G.phase === 'play' ? zoneAt(TUG.s) : 0;
  const bus = AU.mus;
  if (b === 0) for (const n of ch) { tone(mtof(n), sx * 16, 'sawtooth', 0.025, null, w, bus, 0.5); tone(mtof(n) * 1.006, sx * 16, 'sawtooth', 0.02, null, w, bus, 0.5); }
  const bassPat = mode === 'boss' ? [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1] : [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
  if (bassPat[b]) tone(mtof(ch[0] - 24), sx * 1.6, 'sawtooth', 0.09, mtof(ch[0] - 24) * 0.98, w, bus, 0.005);
  if (mode !== 'menu' || b % 2 === 0) { const arp = [0, 1, 2, 1, 0, 2, 1, 2]; if ((b % 2 === 0) || mode === 'boss' || z >= 2) tone(mtof(ch[arp[b % 8]] + 12 + (z >= 2 && b >= 8 ? 12 : 0)), sx * 0.9, 'square', 0.022, null, w, bus); }
  const kick = mode === 'boss' ? b % 4 === 0 : (z >= 1 && G.phase === 'play' && b % 8 === 0);
  if (kick) tone(110, 0.25, 'sine', 0.22, 38, w, bus, 0.002);
  if (b % 2 === 1 && (mode === 'boss' || z >= 1)) noise(0.04, 0.035, 'highpass', 7000, null, 0.7, w, bus);
  if (mode === 'boss' && b === 12) noise(0.15, 0.08, 'bandpass', 1800, 900, 1, w, bus);
};
// ---- optional radio voice (speech synthesis) ----
const VOICE = {
  say(text) {
    if (!SET.voice || !window.speechSynthesis || TEST) return;
    try {
      speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text);
      const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); const pref = vs.find(v => /male|david|daniel|fred|george|alex/i.test(v.name)) || vs[0]; if (pref) u.voice = pref;
      u.rate = 1.08; u.pitch = 0.55; u.volume = 0.9; speechSynthesis.speak(u);
    } catch (e) { }
  }
};
