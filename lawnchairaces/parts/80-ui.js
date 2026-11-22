// Input, menus, settings, HUD and the player controller.
const INPUT = { yaw: 0, pitch: 0, fireEdge: false, pump: false, pour: false, cut: false, breath: false, ads: false, adsToggle: false, blow: false, locked: false, touchLook: null };
const CAMSTATE = { view: 'fp', adsT: 0, stamina: 1, gasp: 0, orbitA: 0.6, focus: [0, 150, 0], lastMode: '' };
const $ = (id) => document.getElementById(id);

function playerUpdate(c, dt) {
  const canAct = c.alive && (G.phase === 'play' || G.phase === 'countdown');
  const d = angWrap(INPUT.yaw - c.yaw);
  c.blower.want = canAct && INPUT.blow;
  // while the blower runs the chair swings round to push where you look
  if (c.blower.on) c.yaw += d * Math.min(1, dt * 2.2);
  else if (Math.abs(d) > 1.0) c.yaw += (d - Math.sign(d) * 1.0) * Math.min(1, dt * 2.5);
  c.aimYaw = INPUT.yaw; c.aimPitch = INPUT.pitch;
  c.pouring = canAct && INPUT.pour && chairWater(c) > 0;
  if (canAct && INPUT.cut && aliveBalloons(c) > 0) {
    c.cutHold += dt;
    if (c.cutHold > 0.7) {
      c.cutHold = 0; INPUT.cut = false;
      const b = c.balloons.filter((x) => x.alive).sort((a, b2) => b2.str - a.str)[0];
      if (b) releaseBalloon(c, b, c, 'cut');
    }
  } else c.cutHold = 0;
  const fire = canAct && G.phase === 'play' && INPUT.fireEdge ? 'edge' : false;
  INPUT.fireEdge = false;
  INPUT.wheelPump = Math.max(0, (INPUT.wheelPump || 0) - dt);
  if (rifleUpdate(c, dt, canAct && (INPUT.pump || INPUT.wheelPump > 0), fire)) {
    const a = playerAim();
    fireRifle(c, a.origin, a.dir);
  }
}
function playerAim() {
  if (CAM.mode === 'fp') return { origin: v3.add(CAM.pos, v3.mul(CAM.fwd, 0.7)), dir: CAM.fwd.slice() };
  // third person: aim where the screen centre points
  const hit = rayPick(CAM.pos, CAM.fwd, 400);
  const target = v3.add(CAM.pos, v3.mul(CAM.fwd, hit ? hit.t : 160));
  const B = chairBasis(G.player);
  const eye = v3.add(B.seat, v3.mul(B.u, 0.78));
  const dir = v3.norm(v3.sub(target, eye));
  return { origin: v3.add(eye, v3.mul(dir, 0.7)), dir };
}
// ray against every balloon; returns nearest hit {t, chair}
function rayPick(o, d, maxT, skip) {
  let best = null;
  const test = (b, c) => {
    const oc = v3.sub(o, b.p), bb = v3.dot(oc, d), cc = v3.dot(oc, oc) - b.r * b.r, h = bb * bb - cc;
    if (h < 0) return;
    const t = -bb - Math.sqrt(h);
    if (t > 0.5 && t < maxT && (!best || t < best.t)) best = { t, chair: c, b };
  };
  for (const c of G.chairs) { if (c === skip) continue; for (const b of c.balloons) if (b.alive) test(b, c); }
  for (const tg of G.targets) for (const b of tg.balloons) if (b.alive) test(b, null);
  for (const f of G.free) test(f, null);
  return best;
}

// ---------- settings ----------
const SETTING_DEFS = [
  { key: 'quality', label: 'Quality', type: 'cycle', opts: ['low', 'medium', 'high', 'max'] },
  { key: 'time', label: 'Time of day', type: 'cycle', opts: ['morning', 'noon', 'golden', 'sunset'] },
  { key: 'guide', label: 'Drop guide', type: 'bool' },
  { key: 'tracers', label: 'Tracers', type: 'bool' },
  { key: 'sound', label: 'Sound', type: 'bool' },
  { key: 'sway', label: 'Chair sway', type: 'bool' },
  { key: 'sens', label: 'Mouse speed', type: 'num', min: 0.3, max: 3, step: 0.1 },
  { key: 'invert', label: 'Invert look', type: 'bool' },
  { key: 'touch', label: 'Touch controls', type: 'bool' },
];
const UI = { paused: false, fps: 60, resultsT: -1, outMsg: null };
UI.load = function () {
  let had = false;
  try {
    const raw = localStorage.getItem('lawnchairaces.settings');
    if (raw) {
      had = true;
      const s = JSON.parse(raw);
      for (const k in s) if (k in G.settings) G.settings[k] = s[k];
      if (s.diff && DIFF[s.diff]) G.diff = s.diff;
    }
  } catch (e) { /* storage unavailable */ }
  if (!had) {
    G.settings.touch = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
    if (G.settings.touch) G.settings.quality = 'low';   // phones and tablets start light; MAX is a tap away
  }
  if (!QUALITY[G.settings.quality]) G.settings.quality = 'high';
  if (!TIMES[G.settings.time]) G.settings.time = 'golden';
  if (URLQ.get('q')) G.settings.quality = URLQ.get('q');
  if (URLQ.get('time')) G.settings.time = URLQ.get('time');
};
UI.save = function () {
  try { localStorage.setItem('lawnchairaces.settings', JSON.stringify({ ...G.settings, diff: G.diff })); } catch (e) { /* ignore */ }
};
UI.apply = function () {
  const s = G.settings;
  R.setQuality(s.quality);
  SKY.set(s.time);
  AUD.setOn(s.sound);
  $('touch').classList.toggle('hidden', !s.touch || G.phase === 'title');
};
UI.valueText = function (d) {
  const v = G.settings[d.key];
  if (d.type === 'bool') return v ? 'ON' : 'OFF';
  if (d.type === 'num') return v.toFixed(1);
  if (d.key === 'quality') return QUALITY[v].label + (UI.fps ? ' · ' + Math.round(UI.fps) + ' FPS' : '');
  if (d.key === 'time') return TIMES[v].label;
  return String(v).toUpperCase();
};
UI.renderSettings = function () {
  for (const host of [$('settingsA'), $('settingsB')]) {
    host.innerHTML = '';
    for (const d of SETTING_DEFS) {
      const row = document.createElement('div'); row.className = 'row';
      const lab = document.createElement('label'); lab.textContent = d.label; row.appendChild(lab);
      if (d.type === 'num') {
        const box = document.createElement('div'); box.className = 'seg';
        const m = document.createElement('button'); m.textContent = '−';
        const val = document.createElement('button'); val.textContent = UI.valueText(d); val.dataset.k = d.key; val.className = 'val';
        const p = document.createElement('button'); p.textContent = '+';
        m.onclick = () => { G.settings[d.key] = clamp(+(G.settings[d.key] - d.step).toFixed(2), d.min, d.max); UI.changed(); };
        p.onclick = () => { G.settings[d.key] = clamp(+(G.settings[d.key] + d.step).toFixed(2), d.min, d.max); UI.changed(); };
        box.append(m, val, p); row.appendChild(box);
      } else {
        const b = document.createElement('button'); b.className = 'pill'; b.dataset.k = d.key; b.textContent = UI.valueText(d);
        b.onclick = () => {
          if (d.type === 'bool') G.settings[d.key] = !G.settings[d.key];
          else { const i = d.opts.indexOf(G.settings[d.key]); G.settings[d.key] = d.opts[(i + 1) % d.opts.length]; }
          UI.changed();
        };
        row.appendChild(b);
      }
      host.appendChild(row);
    }
  }
  for (const b of $('segDiff').children) b.classList.toggle('on', b.dataset.v === G.diff);
};
UI.refreshLabels = function () {
  for (const el of document.querySelectorAll('[data-k]')) {
    const d = SETTING_DEFS.find((x) => x.key === el.dataset.k);
    if (d) el.textContent = UI.valueText(d);
  }
};
UI.changed = function () { UI.apply(); UI.save(); UI.refreshLabels(); };

UI.showTitle = function () {
  G.phase = 'title';
  setupMatch('ffa', 'normal', { spectate: true });
  G.phase = 'title';
  for (const id of ['pause', 'results', 'help']) $(id).classList.add('hidden');
  $('title').classList.remove('hidden');
  $('touch').classList.add('hidden');
  $('clickToPlay').classList.add('hidden');
  UI.paused = false; UI.resultsT = -1; UI.outMsg = null;
  if (document.pointerLockElement) document.exitPointerLock();
};
UI.start = function (mode) {
  AUD.init(); AUD.setOn(G.settings.sound);
  for (const id of ['title', 'pause', 'results', 'help']) $(id).classList.add('hidden');
  setupMatch(mode, G.diff);
  G.phase = 'countdown'; G.countdown = 3.4; UI.lastTick = 4;
  CAMSTATE.view = 'fp'; UI.paused = false; UI.resultsT = -1; UI.outMsg = null;
  INPUT.pump = INPUT.pour = INPUT.cut = INPUT.ads = INPUT.blow = false;
  $('touch').classList.toggle('hidden', !G.settings.touch);
  UI.lock();
};
UI.lock = function () {
  if (TEST || G.settings.touch) return;
  const c = R.canvas;
  try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed now */ }
};
UI.pause = function () {
  if (G.phase !== 'play' && G.phase !== 'countdown') return;
  UI.paused = true;
  $('pause').classList.remove('hidden');
  INPUT.pump = INPUT.pour = INPUT.cut = INPUT.ads = INPUT.blow = false;
  if (document.pointerLockElement) document.exitPointerLock();
};
UI.resume = function () {
  UI.paused = false;
  $('pause').classList.add('hidden');
  $('help').classList.add('hidden');
  UI.lock();
};
UI.onPlayerOut = function (why) {
  UI.outMsg = { why, t: G.t };
};
UI.onMatchOver = function (winner) {
  UI.resultsT = 2.6;
  UI.winner = winner;
};
UI.showResults = function () {
  const p = G.player, w = UI.winner;
  let title = 'Match over', sub = '';
  if (G.mode === 'practice') { title = p && !p.alive ? 'Splashdown!' : 'Time!'; sub = p && !p.alive ? 'Practice ends early when you hit the lake.' : 'Target practice finished.'; }
  else if (p && w === p) { title = 'Last chair aloft!'; sub = 'You rule the sky over the lake.'; }
  else if (w) { title = w.name + ' wins'; sub = p && p.out === 'splash' ? 'You took a swim. The rescue boat is on its way.' : 'Better luck next breeze.'; }
  else { title = 'Everybody got wet'; sub = 'Nobody is left in the air.'; }
  $('resTitle').textContent = title; $('resSub').textContent = sub;
  const st = p ? p.stats : { shots: 0, hits: 0, pops: 0, lost: 0, best: 0, jugs: 0, strings: 0 };
  const rows = G.mode === 'practice'
    ? [['Score', G.score], ['Balloons popped', st.pops], ['Shots', st.shots], ['Accuracy', st.shots ? Math.round(st.hits / st.shots * 100) + '%' : '-'], ['Longest pop', Math.round(st.best) + ' m']]
    : [['Balloons popped', st.pops], ['Shots', st.shots], ['Accuracy', st.shots ? Math.round(st.hits / st.shots * 100) + '%' : '-'], ['Longest pop', st.best ? Math.round(st.best) + ' m' : '-'], ['Jugs holed', st.jugs], ['Strings cut', st.strings], ['Balloons lost', st.lost], ['Time aloft', fmtTime(p && !p.alive ? p.outT - (G.t - G.matchT) : G.matchT)]];
  $('resStats').innerHTML = rows.map((r) => '<div>' + r[0] + '</div><div>' + r[1] + '</div>').join('');
  $('results').classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
};
function fmtTime(s) { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }

UI.bind = function () {
  for (const b of document.querySelectorAll('.mode')) b.onclick = () => UI.start(b.dataset.mode);
  for (const b of $('segDiff').children) b.onclick = () => { G.diff = b.dataset.v; UI.save(); UI.renderSettings(); };
  $('bHelp').onclick = () => $('help').classList.remove('hidden');
  $('bHelp2').onclick = () => $('help').classList.remove('hidden');
  $('bHelpClose').onclick = () => $('help').classList.add('hidden');
  $('bResume').onclick = () => UI.resume();
  $('bRestart').onclick = () => { $('pause').classList.add('hidden'); UI.start(G.mode); };
  $('bQuit').onclick = () => UI.showTitle();
  $('bAgain').onclick = () => UI.start(G.mode);
  $('bMenu').onclick = () => UI.showTitle();
  const cv = R.canvas;
  cv.addEventListener('click', () => {
    if ((G.phase === 'play' || G.phase === 'countdown') && !UI.paused && !document.pointerLockElement) UI.lock();
  });
  document.addEventListener('pointerlockchange', () => {
    INPUT.locked = document.pointerLockElement === cv;
    if (!INPUT.locked && (G.phase === 'play' || G.phase === 'countdown') && !UI.paused && !G.settings.touch && !TEST) UI.pause();
  });
  document.addEventListener('mousemove', (e) => {
    if (!INPUT.locked) return;
    look(e.movementX, e.movementY, 1);
  });
  cv.addEventListener('mousedown', (e) => {
    if (!INPUT.locked) return;
    if (e.button === 0) INPUT.fireEdge = true;
    if (e.button === 2) INPUT.ads = true;
  });
  document.addEventListener('mouseup', (e) => { if (e.button === 2) INPUT.ads = false; });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('wheel', (e) => {
    if (!INPUT.locked || !G.player) return;
    // a wheel notch starts a pump stroke
    if (e.deltaY > 0) { INPUT.wheelPump = 0.3; }
  }, { passive: true });
  const key = (e, down) => {
    const k = e.code;
    if (k === 'KeyR') INPUT.pump = down;
    else if (k === 'KeyW') INPUT.blow = down;
    else if (k === 'Space') { INPUT.pour = down; e.preventDefault(); }
    else if (k === 'KeyE') INPUT.cut = down;
    else if (k === 'ShiftLeft' || k === 'ShiftRight') INPUT.breath = down;
    else if (k === 'KeyQ' && down) INPUT.adsToggle = !INPUT.adsToggle;
    else if (k === 'KeyV' && down) CAMSTATE.view = CAMSTATE.view === 'fp' ? 'chase' : 'fp';
    else if (k === 'KeyF' && down && INPUT.locked) INPUT.fireEdge = true;
    else if (k === 'KeyH' && down) $('help').classList.toggle('hidden');
    else if (k === 'Escape' && down) { if (UI.paused) UI.resume(); }
    else if (k === 'KeyP' && down) { if (UI.paused) UI.resume(); else UI.pause(); }
  };
  document.addEventListener('keydown', (e) => { if (e.repeat) return; key(e, true); });
  document.addEventListener('keyup', (e) => key(e, false));
  window.addEventListener('blur', () => { INPUT.pump = INPUT.pour = INPUT.cut = INPUT.breath = INPUT.ads = INPUT.blow = false; });
  window.addEventListener('resize', () => R.resize());
  UI.bindTouch();
};
function look(dx, dy, scale) {
  const ads = CAMSTATE.adsT;
  const k = 0.0022 * G.settings.sens * scale * lerp(1, 0.3, ads);
  INPUT.yaw -= dx * k;
  INPUT.pitch = clamp(INPUT.pitch - dy * k * (G.settings.invert ? -1 : 1), -1.45, 1.5);
}
UI.bindTouch = function () {
  const hold = (id, on, off) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); AUD.init(); on(); el.setPointerCapture(e.pointerId); });
    const up = (e) => { el.classList.remove('on'); if (off) off(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  hold('tFire', () => { INPUT.fireEdge = true; });
  hold('tPump', () => { INPUT.pump = true; }, () => { INPUT.pump = false; });
  hold('tPour', () => { INPUT.pour = true; }, () => { INPUT.pour = false; });
  hold('tCut', () => { INPUT.cut = true; }, () => { INPUT.cut = false; });
  hold('tBlow', () => { INPUT.blow = true; }, () => { INPUT.blow = false; });
  hold('tScope', () => { INPUT.adsToggle = !INPUT.adsToggle; $('tScope').classList.toggle('on', INPUT.adsToggle); });
  hold('tPause', () => { if (UI.paused) UI.resume(); else UI.pause(); });
  hold('tView', () => { CAMSTATE.view = CAMSTATE.view === 'fp' ? 'chase' : 'fp'; });
  const cv = R.canvas;
  cv.addEventListener('pointerdown', (e) => {
    if (!G.settings.touch || e.pointerType === 'mouse' && INPUT.locked) return;
    if (G.phase !== 'play' && G.phase !== 'countdown') return;
    INPUT.touchLook = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  cv.addEventListener('pointermove', (e) => {
    const t = INPUT.touchLook;
    if (!t || t.id !== e.pointerId) return;
    look((e.clientX - t.x) * 1.6, (e.clientY - t.y) * 1.6, 1);
    t.x = e.clientX; t.y = e.clientY;
  });
  const end = (e) => { if (INPUT.touchLook && INPUT.touchLook.id === e.pointerId) INPUT.touchLook = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
};

// ---------- HUD ----------
const HUD = { ctx: null, marks: [], flashA: 0, guide: null, guideT: 0, range: 0 };
HUD.init = function () {
  HUD.cv = $('hud');
  HUD.ctx = HUD.cv.getContext('2d');
};
HUD.hitMark = function (text) { HUD.marks.push({ text, t: 0 }); if (HUD.marks.length > 4) HUD.marks.shift(); };
HUD.flash = function (a) { HUD.flashA = Math.max(HUD.flashA, a); };
HUD.resize = function () {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  if (HUD.cv.width !== w || HUD.cv.height !== h) { HUD.cv.width = w; HUD.cv.height = h; }
  HUD.dpr = dpr;
};
HUD.text = function (s, x, y, size, col, align, weight, shadow) {
  const c = HUD.ctx;
  c.font = (weight || 700) + ' ' + size + 'px "Avenir Next", "Segoe UI", system-ui, sans-serif';
  c.textAlign = align || 'left';
  c.textBaseline = 'middle';
  if (shadow !== false) { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(s, x + 1.2, y + 1.4); }
  c.fillStyle = col || '#f6ecd6';
  c.fillText(s, x, y);
};
HUD.toScreen = function (p) {
  const q = projectPoint(CAM.vp, p);
  if (!q) return null;
  return [(q[0] * 0.5 + 0.5) * innerWidth, (1 - (q[1] * 0.5 + 0.5)) * innerHeight, q[2], Math.abs(q[0]) <= 1 && Math.abs(q[1]) <= 1];
};
HUD.draw = function (dt) {
  HUD.resize();
  const c = HUD.ctx, W = innerWidth, H = innerHeight;
  c.setTransform(HUD.dpr, 0, 0, HUD.dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  HUD.flashA = Math.max(0, HUD.flashA - dt * 1.4);
  if (G.phase === 'title') { HUD.drawTitleExtras(W, H); return; }
  const p = G.player;
  if (!p) return;
  const fp = CAM.mode === 'fp';
  HUD.drawTags(W, H);
  if (p.alive) {
    if (fp && CAMSTATE.adsT > 0.85) HUD.drawScope(W, H);
    else if (CAM.mode === 'fp' || CAM.mode === 'chase') HUD.drawCrosshair(W, H, p);
    HUD.drawGuide(W, H, p);
    HUD.drawAltimeter(W, H, p);
    HUD.drawBallast(W, H, p);
    HUD.drawBlower(W, H, p);
    HUD.drawRifle(W, H, p);
  }
  HUD.drawTop(W, H);
  HUD.drawFeed(W, H);
  HUD.drawCenter(W, H, p);
  // hit markers
  for (let i = HUD.marks.length - 1; i >= 0; i--) {
    const m = HUD.marks[i]; m.t += dt;
    if (m.t > 1.4) { HUD.marks.splice(i, 1); continue; }
    const a = 1 - smoothstep(0.8, 1.4, m.t);
    c.globalAlpha = a;
    HUD.text(m.text, W / 2, H / 2 - 40 - m.t * 26 - i * 4, 18, '#ffd34d', 'center', 900);
    c.globalAlpha = 1;
  }
  if (TEST) HUD.text(Math.round(UI.fps) + ' fps  ' + R.rw + 'x' + R.rh + '  ' + R.qName, W - 10, H - 12, 11, '#9fd3ff', 'right', 600);
};
HUD.drawTitleExtras = function (W, H) {
  // nothing besides the DOM panel; small credit of the view
  HUD.text('Live view: four neighbours settling an argument', W - 18, H - 18, 12, 'rgba(246,236,214,0.6)', 'right', 600);
};
HUD.drawCrosshair = function (W, H, p) {
  const c = HUD.ctx, x = W / 2, y = H / 2, rf = p.rifle;
  if (rf.lower > 0.5) {
    // pump progress around the centre
    for (let i = 0; i < 10; i++) {
      const a0 = -Math.PI / 2 + i / 10 * TAU + 0.05, a1 = a0 + TAU / 10 - 0.1;
      c.beginPath(); c.arc(x, y, 22, a0, a1);
      c.strokeStyle = i < rf.pumps ? '#ffd34d' : 'rgba(246,236,214,0.25)'; c.lineWidth = 4; c.stroke();
    }
    if (rf.state === 'stroke') { c.beginPath(); c.arc(x, y, 28, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(rf.t / strokeTime(rf.pumps), 0, 1)); c.strokeStyle = 'rgba(246,236,214,0.6)'; c.lineWidth = 2; c.stroke(); }
    HUD.text(rf.state === 'bolt' ? 'BOLT' : String(rf.pumps), x, y, 15, '#f6ecd6', 'center', 800);
    return;
  }
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3;
  c.beginPath(); c.arc(x, y, 8, 0, TAU); c.stroke();
  c.strokeStyle = rf.loaded && rf.pumps > 0 ? '#f6ecd6' : 'rgba(246,236,214,0.45)'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(x, y, 8, 0, TAU); c.stroke();
  c.fillStyle = '#f6ecd6'; c.fillRect(x - 1, y - 1, 2, 2);
  if (p.cutHold > 0) { c.beginPath(); c.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * p.cutHold / 0.7); c.strokeStyle = '#ff8a2a'; c.lineWidth = 3; c.stroke(); HUD.text('LETTING GO', x, y + 30, 12, '#ff8a2a', 'center', 800); }
};
HUD.drawScope = function (W, H, p) {
  const c = HUD.ctx, x = W / 2, y = H / 2, R0 = Math.min(W, H) * 0.46;
  c.save();
  c.fillStyle = '#000';
  c.beginPath(); c.rect(0, 0, W, H); c.arc(x, y, R0, 0, TAU, true); c.fill();
  const g = c.createRadialGradient(x, y, R0 * 0.82, x, y, R0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R0, 0, TAU); c.fill();
  // reticle: thick outer posts, fine centre
  c.strokeStyle = '#0a0a0a'; c.lineWidth = 4;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(x + dx * R0, y + dy * R0); c.lineTo(x + dx * R0 * 0.3, y + dy * R0 * 0.3); c.stroke(); }
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(x - R0 * 0.3, y); c.lineTo(x + R0 * 0.3, y); c.moveTo(x, y - R0 * 0.3); c.lineTo(x, y + R0 * 0.3); c.stroke();
  // mil dots: 5 mrad apart
  const pxPerRad = (H / 2) / Math.tan(CAM.fov / 2);
  const step = 0.005 * pxPerRad;
  c.fillStyle = '#0a0a0a';
  for (let i = 1; i * step < R0 * 0.3; i++) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.arc(x + dx * i * step, y + dy * i * step, 2.2, 0, TAU); c.fill(); }
  }
  c.restore();
  // readouts
  const rf = G.player.rifle;
  const hit = rayPick(CAM.pos, CAM.fwd, 600, G.player);
  HUD.text(hit ? 'RANGE ' + Math.round(hit.t) + ' m' : 'RANGE ---', x, y + R0 * 0.72, 14, '#f6ecd6', 'center', 800);
  HUD.text((rf.loaded ? 'LOADED' : 'SPENT') + ' · ' + rf.pumps + ' PUMPS', x, y + R0 * 0.72 + 20, 12, rf.loaded && rf.pumps ? '#ffd34d' : '#ff8a5a', 'center', 700);
  if (INPUT.breath && CAMSTATE.stamina > 0) HUD.text('HOLDING BREATH', x, y - R0 * 0.72, 12, '#9fd3ff', 'center', 800);
  if (CAMSTATE.gasp > 0) HUD.text('GASP', x, y - R0 * 0.72, 12, '#ff8a5a', 'center', 800);
};
HUD.drawGuide = function (W, H, p) {
  if (!G.settings.guide || CAM.mode !== 'fp' || p.rifle.lower > 0.5) return;
  HUD.guideT -= 1;
  if (HUD.guideT <= 0) {
    HUD.guideT = 4;
    HUD.guide = null;
    const hit = rayPick(CAM.pos, CAM.fwd, 400, p);
    const pumps = p.rifle.pumps;
    if (hit && pumps > 0) {
      const a = playerAim();
      const range = Math.hypot(hit.b.p[0] - a.origin[0], hit.b.p[2] - a.origin[2]);
      const r = simulateShot(a.origin, a.dir, muzzleVel(pumps), p.vel, range, 4);
      if (!r.fell && !r.short) HUD.guide = { p: r.p, range: hit.t };
    }
  }
  if (!HUD.guide) return;
  const s = HUD.toScreen(HUD.guide.p);
  if (!s) return;
  const c = HUD.ctx;
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3.5; c.beginPath(); c.arc(s[0], s[1], 5, 0, TAU); c.stroke();
  c.strokeStyle = '#a6ff6a'; c.lineWidth = 1.6; c.beginPath(); c.arc(s[0], s[1], 5, 0, TAU); c.stroke();
};
HUD.drawTags = function (W, H) {
  const c = HUD.ctx;
  for (const o of G.chairs) {
    if (o === G.player) continue;
    if (!o.alive && G.t - o.outT > 6) continue;
    const top = v3.add(clusterCentre(o), [0, 5.5, 0]);
    const s = HUD.toScreen(top);
    const dist = G.player ? v3.dist(seatPos(G.player), seatPos(o)) : 0;
    const n = aliveBalloons(o);
    if (s && s[3]) {
      const sc = CAMSTATE.adsT > 0.85 ? 1 : 1;
      HUD.text(o.name + (o.alive ? '' : (o.out === 'splash' ? '  SPLASHED' : '  OUT')), s[0], s[1] - 16 * sc, 13, o.look.tag, 'center', 800);
      HUD.text(Math.round(dist) + ' m  ·  ' + n + ' balloons', s[0], s[1] - 2, 11, 'rgba(246,236,214,0.85)', 'center', 600);
    } else if (o.alive && G.player) {
      // edge arrow
      const rel = v3.sub(top, CAM.pos);
      const x = v3.dot(rel, CAM.right), y = v3.dot(rel, CAM.up), z = v3.dot(rel, CAM.fwd);
      let ang = Math.atan2(-y, x);
      if (z < 0 && Math.abs(x) < 1e-3) ang = Math.PI / 2;
      const rx = W / 2 - 60, ry = H / 2 - 60;
      const ex = W / 2 + Math.cos(ang) * rx, ey = H / 2 + Math.sin(ang) * ry;
      c.save(); c.translate(ex, ey); c.rotate(ang);
      c.fillStyle = o.look.tag; c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -8); c.lineTo(-6, 8); c.closePath(); c.fill();
      c.restore();
      HUD.text(o.name + ' ' + Math.round(dist) + ' m', ex - Math.cos(ang) * 26, ey - Math.sin(ang) * 18, 11, o.look.tag, 'center', 800);
    }
  }
};
HUD.drawAltimeter = function (W, H, p) {
  const c = HUD.ctx;
  const compact = G.settings.touch || H < 520;
  const top = compact ? 40 : H * 0.16, bot = compact ? H - (G.settings.touch ? 212 : 130) : H * 0.8, x0 = compact ? 26 : 34, maxA = 320;
  const Y = (a) => bot - clamp(a, -10, maxA) / maxA * (bot - top);
  // panel
  c.fillStyle = 'rgba(14,22,20,0.38)';
  c.beginPath(); c.roundRect ? c.roundRect(x0 - 22, top - 26, 118, bot - top + 60, 10) : c.rect(x0 - 22, top - 26, 118, bot - top + 60); c.fill();
  HUD.text('ALT', x0 - 10, top - 13, 11, 'rgba(246,236,214,0.7)', 'left', 800);
  HUD.text('WIND', x0 + 50, top - 13, 11, 'rgba(246,236,214,0.7)', 'center', 800);
  // water
  c.fillStyle = 'rgba(70,140,170,0.6)'; c.fillRect(x0, bot, 92 - 20, 8);
  c.strokeStyle = 'rgba(246,236,214,0.55)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x0 + 28, top); c.lineTo(x0 + 28, bot); c.stroke();
  for (let a = 0; a <= maxA; a += 20) {
    const y = Y(a), big = a % 100 === 0;
    c.beginPath(); c.moveTo(x0 + 28, y); c.lineTo(x0 + 28 - (big ? 9 : 5), y); c.stroke();
    if (big) HUD.text(String(a), x0 + 15, y, 10, 'rgba(246,236,214,0.75)', 'right', 600, false);
  }
  // wind arrows relative to the view
  const fwd = [Math.sin(INPUT.yaw), Math.cos(INPUT.yaw)], right = [-Math.cos(INPUT.yaw), Math.sin(INPUT.yaw)];
  const seat = seatPos(p);
  for (let a = 10; a < maxA; a += 20) {
    const w = WIND.at(p.hub[0], a + 7, p.hub[2], G.t);
    const sp = Math.hypot(w[0], w[1]);
    const fx = w[0] * right[0] + w[1] * right[1], fz = w[0] * fwd[0] + w[1] * fwd[1];
    const ang = Math.atan2(-fz, fx);
    const len = 5 + sp * 3.2;
    const x = x0 + 52, y = Y(a);
    const near = Math.abs(a - seat[1]) < 10;
    c.save(); c.translate(x, y); c.rotate(ang);
    c.strokeStyle = near ? '#ffd34d' : 'rgba(159,211,255,' + (0.45 + sp * 0.1) + ')'; c.fillStyle = c.strokeStyle; c.lineWidth = near ? 2.2 : 1.5;
    c.beginPath(); c.moveTo(-len / 2, 0); c.lineTo(len / 2, 0); c.stroke();
    c.beginPath(); c.moveTo(len / 2 + 3, 0); c.lineTo(len / 2 - 3, -3.5); c.lineTo(len / 2 - 3, 3.5); c.closePath(); c.fill();
    c.restore();
  }
  // opponents
  for (const o of G.chairs) {
    if (o === p || !o.alive) continue;
    const y = Y(seatPos(o)[1]);
    c.fillStyle = o.look.tag; c.beginPath(); c.arc(x0 + 28, y, 5, 0, TAU); c.fill();
    HUD.text(o.name[0], x0 + 28, y, 8, '#111', 'center', 900, false);
  }
  // float height
  const eq = eqAltitude(p);
  if (eq >= 0) {
    const y = Y(eq);
    c.strokeStyle = '#7fe3ff'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(x0 + 18, y); c.lineTo(x0 + 8, y - 6); c.lineTo(x0 + 8, y + 6); c.closePath(); c.stroke();
  } else {
    HUD.text('SINKING', x0 + 36, bot + 20, 12, (G.t * 3 % 1) < 0.6 ? '#ff5a3c' : '#ffb09f', 'center', 900);
  }
  // you
  const y = Y(seat[1]);
  c.fillStyle = '#ffd34d';
  c.beginPath(); c.moveTo(x0 + 26, y); c.lineTo(x0 + 14, y - 7); c.lineTo(x0 + 14, y + 7); c.closePath(); c.fill();
  const vs = p.vel[1];
  HUD.text(Math.round(seat[1]) + ' m', x0 + 12, y - 15, 12, '#ffd34d', 'right', 800);
  HUD.text((vs >= 0 ? '↑' : '↓') + Math.abs(vs).toFixed(1), x0 + 12, y + 15, 10, Math.abs(vs) > 1.5 ? '#ff8a5a' : 'rgba(246,236,214,0.8)', 'right', 700);
};
HUD.drawBallast = function (W, H, p) {
  const c = HUD.ctx, touch = G.settings.touch;
  const x = touch ? 178 : 20, y = H - (touch ? 80 : 86);
  c.fillStyle = 'rgba(14,22,20,0.45)';
  c.beginPath(); c.roundRect ? c.roundRect(x, y, 230, 70, 10) : c.rect(x, y, 230, 70); c.fill();
  // balloon icon
  const n = aliveBalloons(p);
  c.fillStyle = '#e2462e'; c.beginPath(); c.ellipse(x + 22, y + 22, 9, 11, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(246,236,214,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 22, y + 33); c.lineTo(x + 22, y + 42); c.stroke();
  HUD.text(n + ' / ' + PHYS.nBalloons, x + 40, y + 22, 18, n <= 21 ? '#ff8a5a' : '#f6ecd6', 'left', 800);
  HUD.text('BALLOONS', x + 40, y + 40, 9, 'rgba(246,236,214,0.6)', 'left', 800);
  // jugs
  for (let j = 0; j < 6; j++) {
    const jx = x + 120 + j * 17, jy = y + 12, jh = 26;
    const f = p.jugs[j].kg / (PHYS.waterMax / 6);
    c.strokeStyle = p.jugs[j].leak ? '#ff8a5a' : 'rgba(246,236,214,0.7)'; c.lineWidth = 1.2;
    c.strokeRect(jx, jy, 12, jh);
    c.fillStyle = 'rgba(120,190,240,0.85)'; c.fillRect(jx + 1.5, jy + 1.5 + (jh - 3) * (1 - f), 9, (jh - 3) * f);
  }
  HUD.text(chairWater(p).toFixed(1) + ' kg water', x + 120, y + 52, 11, p.pouring ? '#9fd3ff' : 'rgba(246,236,214,0.8)', 'left', 700);
  if (!touch) HUD.text(p.pouring ? 'POURING' : 'SPACE pour  ·  E let go', x + 12, y + 58, 9, 'rgba(246,236,214,0.55)', 'left', 700);
};
HUD.drawBlower = function (W, H, p) {
  const c = HUD.ctx, bl = p.blower, touch = G.settings.touch;
  const x = touch ? 178 : 20, y = H - (touch ? 80 : 86) - 30, w = 230;
  c.fillStyle = 'rgba(14,22,20,0.45)';
  c.beginPath(); c.roundRect ? c.roundRect(x, y, w, 24, 8) : c.rect(x, y, w, 24); c.fill();
  const label = bl.lock ? 'BLOWER HOT' : bl.on ? 'BLOWING' : (touch ? 'BLOWER' : 'BLOWER  W');
  HUD.text(label, x + 10, y + 12, 10, bl.lock ? '#ff5a3c' : bl.on ? '#ffd34d' : 'rgba(246,236,214,0.8)', 'left', 800);
  const bx = x + 96, bw = w - 106, left = 1 - bl.heat;
  c.fillStyle = 'rgba(246,236,214,0.15)'; c.fillRect(bx, y + 8, bw, 8);
  c.fillStyle = bl.lock ? '#ff5a3c' : left < 0.3 ? '#ff8a2a' : '#f2cf3c';
  c.fillRect(bx, y + 8, bw * left, 8);
  if (bl.lock) { c.fillStyle = 'rgba(246,236,214,0.6)'; c.fillRect(bx + bw * (1 - PHYS.blowRestart), y + 6, 1.5, 12); }
};
HUD.drawRifle = function (W, H, p) {
  const c = HUD.ctx, rf = p.rifle, touch = G.settings.touch;
  const x = touch ? Math.max(W - 452, 410) : W - 250, y = H - (touch ? 80 : 86);
  c.fillStyle = 'rgba(14,22,20,0.45)';
  c.beginPath(); c.roundRect ? c.roundRect(x, y, 230, 70, 10) : c.rect(x, y, 230, 70); c.fill();
  for (let i = 0; i < 10; i++) {
    c.fillStyle = i < rf.pumps ? '#ffd34d' : 'rgba(246,236,214,0.2)';
    c.fillRect(x + 14 + i * 20, y + 14, 15, 12);
  }
  let st, col = '#f6ecd6';
  if (rf.state === 'bolt') st = 'WORKING THE BOLT';
  else if (rf.state === 'stroke') st = 'PUMPING ' + (rf.pumps + 1) + ' / 10';
  else if (!rf.loaded) { st = touch ? 'SPENT · HOLD PUMP TO RELOAD' : 'SPENT · HOLD R TO RELOAD'; col = '#ff8a5a'; }
  else if (rf.pumps === 0) { st = touch ? 'LOADED · HOLD PUMP' : 'LOADED · HOLD R TO PUMP'; col = '#ffd34d'; }
  else st = 'READY · ' + rf.pumps + ' PUMPS · ' + Math.round(muzzleVel(rf.pumps)) + ' m/s';
  HUD.text(st, x + 14, y + 42, 12, col, 'left', 800);
  if (!touch) HUD.text('CLICK fire · RMB scope · SHIFT steady', x + 14, y + 58, 9, 'rgba(246,236,214,0.55)', 'left', 700);
};
HUD.drawTop = function (W, H) {
  const others = G.chairs.filter((o) => o !== G.player);
  if (G.mode === 'practice') {
    HUD.text('SCORE ' + G.score, W / 2 - 70, 30, 20, '#ffd34d', 'center', 900);
    HUD.text(fmtTime(G.practiceLeft), W / 2 + 70, 30, 20, G.practiceLeft < 20 ? '#ff8a5a' : '#f6ecd6', 'center', 900);
    return;
  }
  const w = 150, gap = 12, total = others.length * w + (others.length - 1) * gap;
  let x = W / 2 - total / 2;
  const c = HUD.ctx;
  for (const o of others) {
    c.fillStyle = 'rgba(14,22,20,0.45)';
    c.beginPath(); c.roundRect ? c.roundRect(x, 12, w, 40, 8) : c.rect(x, 12, w, 40); c.fill();
    HUD.text(o.name, x + 10, 24, 12, o.look.tag, 'left', 900);
    const n = aliveBalloons(o);
    HUD.text(o.alive ? Math.round(seatPos(o)[1]) + ' m' : (o.out === 'splash' ? 'SPLASHED' : 'OUT'), x + w - 10, 24, 11, o.alive ? 'rgba(246,236,214,0.8)' : '#ff8a5a', 'right', 800);
    const pw = (w - 20) / PHYS.nBalloons;
    for (let i = 0; i < PHYS.nBalloons; i++) {
      c.fillStyle = i < n ? o.look.tag : 'rgba(246,236,214,0.15)';
      c.fillRect(x + 10 + i * pw, 38, pw - 1.2, 7);
    }
    x += w + gap;
  }
};
HUD.drawFeed = function (W, H) {
  let y = 72;
  for (let i = G.feed.length - 1; i >= 0 && y < 230; i--) {
    const f = G.feed[i], age = G.t - f.t;
    if (age > 9) continue;
    HUD.ctx.globalAlpha = 1 - smoothstep(7, 9, age);
    HUD.text(f.s, W - 20, y, f.big ? 14 : 12, f.big ? f.col : '#f6ecd6', 'right', f.big ? 900 : 700);
    HUD.ctx.globalAlpha = 1;
    y += 20;
  }
};
HUD.drawCenter = function (W, H, p) {
  if (G.phase === 'countdown') {
    const n = Math.ceil(G.countdown);
    if (n !== UI.lastTick) { UI.lastTick = n; if (n > 0 && n <= 3) AUD.tick(false); }
    HUD.text(n > 3 ? 'GET READY' : String(n), W / 2, H * 0.32, n > 3 ? 30 : 64, '#f6ecd6', 'center', 900);
    HUD.text(G.mode === 'practice' ? 'Pop the tethered balloons. Longer shots score more.' : (G.settings.touch ? 'Hold PUMP' : 'Hold R') + ' to pump the rifle. Last chair in the air wins.', W / 2, H * 0.32 + 46, 14, 'rgba(246,236,214,0.85)', 'center', 700);
    return;
  }
  if (G.phase === 'play' && G.matchT < 1.2) HUD.text(G.mode === 'practice' ? 'GO!' : 'FIRE AWAY!', W / 2, H * 0.32, 48, '#ffd34d', 'center', 900);
  if (UI.outMsg) {
    const age = G.t - UI.outMsg.t;
    const t = { splash: 'SPLASHDOWN!', drift: 'DRIFTED OFF', landed: 'DOWN ON THE SHORE' }[UI.outMsg.why] || 'OUT';
    if (age < 5) HUD.text(t, W / 2, H * 0.3, 52, '#ff8a5a', 'center', 900);
    if (age > 2.5 && G.phase === 'play') HUD.text('Spectating…', W / 2, H - 40, 14, 'rgba(246,236,214,0.8)', 'center', 700);
  }
  if (!p.alive || G.phase !== 'play') {
    if (G.phase === 'over' && UI.winner === p && p) HUD.text('LAST CHAIR ALOFT!', W / 2, H * 0.3, 46, '#ffd34d', 'center', 900);
    return;
  }
  const seat = seatPos(p), eq = eqAltitude(p);
  let warn = null;
  if (eq < 0 && chairWater(p) > 0 && !p.pouring) warn = [G.settings.touch ? 'SINKING! HOLD POUR' : 'SINKING! HOLD SPACE TO POUR WATER', '#ff5a3c'];
  else if (eq < 0 && chairWater(p) <= 0) warn = ['OUT OF BALLAST', '#ff5a3c'];
  else if (seat[1] < 40 && p.vel[1] < -0.3) warn = ['LOW OVER THE WATER', '#ff8a5a'];
  const r = Math.hypot(p.hub[0], p.hub[2]);
  const outward = (p.hub[0] * p.vel[0] + p.hub[2] * p.vel[2]) / Math.max(r, 1);
  if (!warn && r > 470 && outward > 0.2) warn = ['NEAR THE SHORE: CLIMB OR SINK TO CHANGE WIND', '#ffd34d'];
  if (warn && (G.t * 2.2 % 1) < 0.7) HUD.text(warn[0], W / 2, H * 0.24, 18, warn[1], 'center', 900);
};
