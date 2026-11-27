// ===== Procedural audio (WebAudio): gun, flares, creatures, rail clatter, cave reverb, drone =====
const SND = (() => {
  let AC = null, master, comp, wet, dry, noise, brown, ride = null, on = SAVE.get('sound', true), clackAcc = 0, dripT = 1;
  function unlock() {
    if (AC || TEST) return;
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.connect(AC.destination);
    master = AC.createGain(); master.gain.value = on ? .8 : 0; master.connect(comp);
    dry = AC.createGain(); dry.connect(master);
    const conv = AC.createConvolver(), len = AC.sampleRate * 2.6, ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 800 ? i / 800 : 1); }
    conv.buffer = ir; wet = AC.createGain(); wet.gain.value = .42; wet.connect(conv); conv.connect(master);
    noise = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    brown = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); { const d = brown.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
    if (G.phase === 'play') startRide();
  }
  const out = (pan, rv) => { const g = AC.createGain(), p = AC.createStereoPanner ? AC.createStereoPanner() : null; if (p) { p.pan.value = clamp(pan || 0, -1, 1); g.connect(p); p.connect(dry); if (rv) { const s = AC.createGain(); s.gain.value = rv; p.connect(s); s.connect(wet); } } else { g.connect(dry); } return g; };
  function posMix(p) { if (!p) return [0, 1]; const q = project(p), d = V.dist(p, G.cam.p); return [q ? clamp(q[0], -1, 1) * .8 : 0, 1 / (1 + d * .07)]; }
  function nz(dur, f0, f1, q, type, vol, pan, rv, a, buf) {
    if (!AC || !on) return; const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = buf || noise; s.loop = true;
    const fl = AC.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); fl.Q.value = q || 1;
    const g = out(pan, rv === undefined ? .4 : rv); const e = AC.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + (a || .005)); e.gain.exponentialRampToValueAtTime(.0005, t + dur);
    s.connect(fl); fl.connect(e); e.connect(g); s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
  }
  function tone(dur, f0, f1, type, vol, pan, rv, a, delay) {
    if (!AC || !on) return; const t = AC.currentTime + (delay || 0), o = AC.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = out(pan, rv === undefined ? .3 : rv), e = AC.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + (a || .004)); e.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(e); e.connect(g); o.start(t); o.stop(t + dur + .05);
  }
  function startRide() {
    if (!AC || ride) return;
    const r = AC.createBufferSource(); r.buffer = brown; r.loop = true; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; const g = AC.createGain(); g.gain.value = 0; r.connect(lp); lp.connect(g); g.connect(dry); r.start();
    const w = AC.createBufferSource(); w.buffer = noise; w.loop = true; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .6; const wg = AC.createGain(); wg.gain.value = 0; w.connect(bp); bp.connect(wg); wg.connect(dry); w.start();
    const o1 = AC.createOscillator(), o2 = AC.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 55; o2.frequency.value = 55.6;
    const dl = AC.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 260; const dg = AC.createGain(); dg.gain.value = .035; o1.connect(dl); o2.connect(dl); dl.connect(dg); dg.connect(dry); const ds = AC.createGain(); ds.gain.value = .5; dg.connect(ds); ds.connect(wet); o1.start(); o2.start();
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = .07; lg.gain.value = 120; lfo.connect(lg); lg.connect(dl.frequency); lfo.start();
    ride = { r, g, w, wg, o1, o2, dg, dl, lfo, beat: 0 };
  }
  function stopRide() { if (!ride) return; for (const k of ['r', 'w', 'o1', 'o2', 'lfo']) try { ride[k].stop(); } catch (e) {} ride = null; }
  return {
    unlock, startRide, stopRide,
    get on() { return on; },
    toggle() { on = !on; SAVE.set('sound', on); if (master) master.gain.value = on ? .8 : 0; return on; },
    ride(speed, dt) {
      if (!AC || !ride) return; const t = AC.currentTime;
      ride.g.gain.setTargetAtTime(Math.min(.55, speed * .045), t, .1);
      const wy = TRACK.riverCh ? chNorm(TRACK.riverCh, G.cam.p) : 9; ride.wg.gain.setTargetAtTime(wy < 1.4 ? (1.4 - wy) * .12 : 0, t, .3);
      const boss = BOSS.state === 'fight' || BOSS.state === 'wake';
      ride.dg.gain.setTargetAtTime(boss ? .07 : .035, t, .5); ride.o1.frequency.setTargetAtTime(boss ? 49 : 55, t, 1); ride.o2.frequency.setTargetAtTime(boss ? 49.7 : 55.6, t, 1);
      clackAcc += speed * dt; if (clackAcc > 4.2) { clackAcc = 0; const v = Math.min(.5, speed * .04); nz(.05, 2600, 1400, 2, 'bandpass', v, 0, .2); setTimeout(() => nz(.05, 2300, 1200, 2, 'bandpass', v * .8, 0, .2), Math.min(200, 1300 / Math.max(speed, 1))); tone(.08, 120, 70, 'triangle', v * .4, 0, .1); }
      dripT -= dt; if (dripT < 0) { dripT = .8 + Math.random() * 2.5; tone(.25, 1400 + Math.random() * 1400, 700, 'sine', .05, (Math.random() - .5) * 1.6, 1.2); }
      if (boss) { ride.beat -= dt; if (ride.beat < 0) { ride.beat = BOSS.atk ? .38 : .55; tone(.3, 70, 38, 'sine', .25, 0, .3); } }
    },
    shoot() { nz(.09, 2400, 600, .9, 'bandpass', .3, .25, .3); tone(.09, 160, 55, 'square', .12, .25, .2); },
    hitFlesh(t) { nz(.06, t === 'boss' ? 500 : 1200, 300, 2, 'bandpass', .18, 0, .1); },
    ping() { tone(.25, 2200, 1900, 'triangle', .08, 0, .4); },
    squish() { nz(.25, 700, 120, 1.5, 'lowpass', .3, 0, .3); },
    squeak() { tone(.12, 2600, 1500, 'sine', .1, 0, .3); },
    splinter() { nz(.4, 1800, 300, .8, 'bandpass', .4, 0, .5); nz(.2, 400, 90, 1, 'lowpass', .4, 0, .4); },
    rockBreak() { nz(.6, 900, 80, .7, 'lowpass', .55, 0, .6); tone(.4, 90, 35, 'sine', .3, 0, .4); },
    thud(p) { const [pn, v] = posMix(p); nz(.5, 300, 60, 1, 'lowpass', .5 * v, pn, .6); tone(.4, 70, 30, 'sine', .3 * v, pn, .3); },
    crumble(p) { const [pn, v] = posMix(p); nz(.8, 700, 150, .5, 'lowpass', .25 * v, pn, .7); },
    creak(p, loud) { if (!AC || !on) return; const [pn, v] = posMix(p); tone(loud ? .9 : .6, loud ? 140 : 110, loud ? 60 : 95, 'sawtooth', .07 * v, pn, .6, .1); if (loud) nz(.6, 600, 200, 3, 'bandpass', .2 * v, pn, .6); },
    rumble(p) { const [pn, v] = posMix(p); nz(1.0, 220, 50, .7, 'lowpass', .5 * v, pn, .6, .05, brown); nz(.4, 900, 200, .6, 'bandpass', .25 * v, pn, .5); },
    hiss(p, loud) { const [pn, v] = posMix(p); nz(loud ? .35 : .5, 5000, 3000, 1.2, 'highpass', (loud ? .2 : .1) * v, pn, .4, .05); },
    bats(n) { for (let i = 0; i < Math.min(6, n); i++) tone(.07, 5200 + Math.random() * 2500, 3800, 'sine', .05, (Math.random() - .5) * 1.4, .5, .002, i * .09 + Math.random() * .05); nz(1.2, 2500, 1800, .5, 'bandpass', .06, 0, .5, .3); },
    batSqueak(p) { const [pn, v] = posMix(p); tone(.09, 6400, 4200, 'sine', .08 * v, pn, .3); },
    roarSmall(p) { const [pn, v] = posMix(p); tone(.5, 180, 90, 'sawtooth', .12 * v, pn, .5, .05); },
    roar(k) { if (!AC || !on) return; k = k || 1; const d = 1.4 * k + .6; tone(d, 75, 42, 'sawtooth', .3, 0, .8, .15); tone(d, 112, 60, 'sawtooth', .18, 0, .8, .15); nz(d, 700, 200, 4, 'bandpass', .3, 0, .8, .2); nz(d, 300, 80, 1, 'lowpass', .5, 0, .6, .2, brown); },
    flareLaunch() { nz(.45, 900, 3500, .8, 'bandpass', .25, .3, .4); tone(.12, 300, 900, 'square', .06, .3, .2); },
    flareIgnite(p) { const [pn, v] = posMix(p); nz(.9, 3000, 1200, .5, 'bandpass', .3 * v, pn, .6, .02); nz(.4, 300, 80, 1, 'lowpass', .3 * v, pn, .5); },
    fizz() { nz(.8, 4000, 2000, 1, 'highpass', .2, 0, .4); },
    whoomp(big) { nz(big ? .9 : .5, 200, 900, .7, 'lowpass', big ? .5 : .3, 0, .5, .08); tone(.2, 2600, 2500, 'triangle', .04, 0, .3); },
    chime(col) { const base = 520 + (col[0] * 300 + col[2] * 500); for (const [m, v, d] of [[1, .12, 2.2], [2.76, .06, 1.6], [5.4, .04, 1.1], [1.5, .05, 1.8]]) tone(d, base * m, base * m * .998, 'sine', v, (Math.random() - .5), 1.4, .003); },
    lever() { tone(.12, 900, 600, 'square', .08, .3, .4); nz(.15, 1500, 400, 2, 'bandpass', .3, .3, .4); tone(.3, 260, 200, 'triangle', .12, .3, .4, .002, .08); },
    pickup() { tone(.12, 660, 660, 'triangle', .12, 0, .3); tone(.18, 990, 990, 'triangle', .12, 0, .4, .004, .09); },
    tear() { nz(.35, 3000, 900, .8, 'bandpass', .2, 0, .3); },
    combo(m) { tone(.12, 440 * Math.pow(1.122, m), 440 * Math.pow(1.122, m) * 1.5, 'triangle', .1, 0, .3); },
    tick() { tone(.06, 1800, 1800, 'sine', .07, .6, .2); },
    hurt(d) { nz(.35, 400, 80, 1, 'lowpass', .5, 0, .3); tone(.3, 140, 50, 'sine', .4, 0, .2); },
    crash() { nz(1.6, 1200, 60, .6, 'lowpass', .7, 0, .7); tone(1.2, 90, 25, 'sine', .5, 0, .5); },
    fanfare() { [0, 4, 7, 12].forEach((s, i) => tone(.6, 330 * Math.pow(2, s / 12), 330 * Math.pow(2, s / 12), 'triangle', .14, 0, .6, .01, i * .14)); },
  };
})();
