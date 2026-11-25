// ---------- game: journal, input, camera, HUD, loop, boot ----------
const QS = new URLSearchParams(location.search), TEST = QS.has('test');
const SET = { quality: 1, sound: 1 };
try { Object.assign(SET, JSON.parse(localStorage.getItem('bramblebear.settings') || '{}')); } catch (e) { }
function saveSet() { try { localStorage.setItem('bramblebear.settings', JSON.stringify(SET)); } catch (e) { } }
const GAME = { mode: 'title', belly: 0.45, stats: { fish: 0, scared: 0, berries: 0, snacks: 0, photos: 0 }, done: {}, t: 0, toastQ: [], toastT: 0 };

// ---------- the journal ----------
const GOALS = [
  { id: 'falls', icon: '🌊', t: 'Find the waterfall' },
  { id: 'fish', icon: '🐟', t: 'Catch salmon', n: 5 },
  { id: 'leap', icon: '🎣', t: 'Catch a leaping salmon' },
  { id: 'scare', icon: '😱', t: 'Spook hikers', n: 6 },
  { id: 'photo', icon: '📸', t: 'Pose for a photo' },
  { id: 'berries', icon: '🫐', t: 'Eat berries', n: 20 },
  { id: 'picnic', icon: '🧺', t: 'Raid a picnic basket' },
  { id: 'lake', icon: '🏊', t: 'Swim across the lake' },
  { id: 'shower', icon: '🚿', t: 'Shower under the falls' },
  { id: 'clifftop', icon: '⛰️', t: 'Roar from the clifftop' }
];
function journalLoad() {
  try { const j = JSON.parse(localStorage.getItem('bramblebear.day') || 'null'); if (j) { GAME.done = j.done || {}; Object.assign(GAME.stats, j.stats || {}); GAME.belly = j.belly ?? GAME.belly; } } catch (e) { }
}
let saveT = 0;
function journalSave() { try { localStorage.setItem('bramblebear.day', JSON.stringify({ done: GAME.done, stats: GAME.stats, belly: +GAME.belly.toFixed(3) })); } catch (e) { } }
function journalDone(id) {
  if (GAME.done[id]) return;
  GAME.done[id] = 1; journalSave(); journalRender();
  const g = GOALS.find(g => g.id === id);
  const n = GOALS.filter(g => GAME.done[g.id]).length;
  GAME.toastQ.push([g.icon + ' ' + g.t, n === GOALS.length ? 'Every page filled. Bear of the year!' : 'Journal ' + n + ' of ' + GOALS.length]);
  AUD.chime();
  const li = document.querySelector('#jList li[data-id="' + id + '"]'); if (li) { li.animate([{ background: 'rgba(168,224,124,.35)' }, { background: 'transparent' }], { duration: 1400 }); }
}
function journalCount(id, n) { const g = GOALS.find(g => g.id === id); if (g && n >= g.n) journalDone(id); journalRender(); }
function journalRender() {
  const st = { fish: GAME.stats.fish, scare: GAME.stats.scared, berries: GAME.stats.berries };
  let n = 0;
  document.getElementById('jList').innerHTML = GOALS.map(g => {
    const d = !!GAME.done[g.id]; if (d) n++;
    const c = g.n ? `<b>${Math.min(g.n, st[g.id] || 0)}/${g.n}</b>` : '';
    return `<li data-id="${g.id}" class="${d ? 'done' : ''}"><i>${d ? '✔' : g.icon}</i><span>${g.t}</span>${c}</li>`;
  }).join('');
  document.getElementById('jCount').textContent = n + '/' + GOALS.length;
}
function toast(a, b) { GAME.toastQ.push([a, b]); if (GAME.toastQ.length > 3) GAME.toastQ.splice(0, GAME.toastQ.length - 3); }

// ---------- input ----------
const KEYS = new Set();
const INP = { mx: 0, mz: 0, run: false, jump: false, lookX: 0, lookY: 0, lastLook: -9, joy: null, look: null, runT: false, test: null };
function initInput() {
  addEventListener('keydown', e => {
    if (e.repeat && !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { }
    KEYS.add(e.code);
    if (GAME.mode === 'play') {
      if (e.code === 'KeyE' && !e.repeat) bearSwipe();
      if (e.code === 'KeyR' && !e.repeat) bearRoar();
      if (e.code === 'KeyJ' && !e.repeat) document.getElementById('journal').classList.toggle('mini');
      if (e.code === 'Space') e.preventDefault();
      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat && !document.pointerLockElement) pauseGame(true);
    } else if (GAME.mode === 'paused' && (e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) pauseGame(false);
    else if (GAME.mode === 'title' && e.code === 'Enter') startGame();
    if (e.code === 'KeyM' && !e.repeat) setSound(SET.sound ? 0 : 1);
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', e => KEYS.delete(e.code));
  addEventListener('blur', () => KEYS.clear());
  const cv = document.getElementById('gl');
  let drag = null;
  cv.addEventListener('mousedown', e => { if (GAME.mode !== 'play') return; AUD.init(); if (document.pointerLockElement) { if (e.button === 0) bearSwipe(); return; } drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
  addEventListener('mousemove', e => {
    if (document.pointerLockElement) { INP.lookX += e.movementX; INP.lookY += e.movementY; INP.lastLook = GAME.t; return; }
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    INP.lookX += dx * 1.3; INP.lookY += dy * 1.3; INP.lastLook = GAME.t;
  });
  addEventListener('mouseup', e => { if (drag && drag.moved < 6 && GAME.mode === 'play' && e.button === 0 && !TEST) { cv.requestPointerLock?.(); } drag = null; });
  addEventListener('wheel', e => { if (GAME.mode === 'play') CAM.dist = clamp(CAM.dist * (1 + Math.sign(e.deltaY) * 0.1), 3.5, 14); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && GAME.mode === 'play') { } });
  // touch: left stick, drag anywhere else to look, buttons
  const joy = document.getElementById('joy'), knob = joy.querySelector('i');
  const joyMove = (t) => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } INP.joy.dx = dx; INP.joy.dy = dy; knob.style.transform = `translate(${dx * 38}px,${dy * 38}px)`; };
  joy.addEventListener('touchstart', e => { e.preventDefault(); AUD.init(); const t = e.changedTouches[0]; INP.joy = { id: t.identifier, dx: 0, dy: 0 }; joyMove(t); }, { passive: false });
  cv.addEventListener('touchstart', e => { AUD.init(); for (const t of e.changedTouches) if (!INP.look) INP.look = { id: t.identifier, x: t.clientX, y: t.clientY }; }, { passive: true });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (INP.joy && t.identifier === INP.joy.id) joyMove(t);
      else if (INP.look && t.identifier === INP.look.id) { INP.lookX += (t.clientX - INP.look.x) * 1.6; INP.lookY += (t.clientY - INP.look.y) * 1.6; INP.look.x = t.clientX; INP.look.y = t.clientY; INP.lastLook = GAME.t; }
    }
  }, { passive: true });
  const tEnd = e => { for (const t of e.changedTouches) { if (INP.joy && t.identifier === INP.joy.id) { INP.joy = null; knob.style.transform = ''; } if (INP.look && t.identifier === INP.look.id) INP.look = null; } };
  addEventListener('touchend', tEnd); addEventListener('touchcancel', tEnd);
  const tb = (id, fn) => { const el = document.getElementById(id); el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AUD.init(); fn(true, el); }, { passive: false }); el.addEventListener('touchend', e => { e.preventDefault(); fn(false, el); }); el.addEventListener('click', () => fn(true, el)); };
  tb('tRoar', d => { if (d) bearRoar(); });
  tb('tSwipe', d => { if (d) bearSwipe(); });
  tb('tJump', d => { INP.tJump = d; });
  tb('tRun', (d, el) => { if (d) { INP.runT = !INP.runT; el.classList.toggle('on', INP.runT); } });
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
}
function pollInput() {
  if (INP.test) return Object.assign({ mx: 0, mz: 0, run: false, jump: false }, INP.test);
  let mx = 0, mz = 0;
  if (KEYS.has('KeyW') || KEYS.has('ArrowUp')) mz += 1;
  if (KEYS.has('KeyS') || KEYS.has('ArrowDown')) mz -= 1;
  if (KEYS.has('KeyD') || KEYS.has('ArrowRight')) mx += 1;
  if (KEYS.has('KeyA') || KEYS.has('ArrowLeft')) mx -= 1;
  let run = KEYS.has('ShiftLeft') || KEYS.has('ShiftRight');
  if (INP.joy) { mx = INP.joy.dx; mz = -INP.joy.dy; if (Math.hypot(mx, mz) > 0.92) run = true; }
  if (INP.runT) run = true;
  return { mx, mz, run, jump: KEYS.has('Space') || !!INP.tJump };
}

// ---------- camera ----------
const CAM = { yaw: 0, pitch: 0.32, dist: 6.5, pos: [0, 10, 0], tgt: [0, 0, 0], fov: 1.0, fixed: null };
function updateCamera(dt) {
  const sens = 0.0042;
  CAM.yaw -= INP.lookX * sens; CAM.pitch = clamp(CAM.pitch + INP.lookY * sens * 0.8, -0.25, 1.2); INP.lookX = INP.lookY = 0;
  // drift back behind the bear when it's moving and nobody is steering the camera
  if (GAME.t - INP.lastLook > 1.6 && BR.speed > 1.5) CAM.yaw += wrapA(BR.yaw - CAM.yaw) * (1 - Math.exp(-dt * 0.9));
  const tgt = [BR.x, BR.y + 1.45 + BR.stand * 0.6, BR.z];
  for (let i = 0; i < 3; i++) CAM.tgt[i] = damp(CAM.tgt[i], tgt[i], 12, dt);
  const want = CAM.dist * (BR.run ? 1.12 : 1);
  const dir = [-Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), -Math.cos(CAM.yaw) * Math.cos(CAM.pitch)];
  // pull in if the hillside is in the way
  let d = want;
  for (let k = 1; k <= 10; k++) { const t = want * k / 10, x = CAM.tgt[0] + dir[0] * t, y = CAM.tgt[1] + dir[1] * t, z = CAM.tgt[2] + dir[2] * t; if (y < groundH(x, z) + 0.4) { d = Math.max(1.6, t - want * 0.1); break; } }
  CAM.curD = CAM.curD === undefined ? d : (d < CAM.curD ? d : damp(CAM.curD, d, 3, dt));
  const p = [CAM.tgt[0] + dir[0] * CAM.curD, CAM.tgt[1] + dir[1] * CAM.curD, CAM.tgt[2] + dir[2] * CAM.curD];
  { const q = [p[0], 0, p[2]]; if (colPush(q, 2.0)) { p[0] = q[0]; p[2] = q[2]; } }   // keep the lens out of tree trunks
  p[1] = Math.max(p[1], groundH(p[0], p[2]) + 0.45);
  const wh = waterH(p[0], p[2]); if (wh > -1e8 && p[1] < wh + 0.3) p[1] = wh + 0.3;
  CAM.pos = p; CAM.fov = damp(CAM.fov, BR.run ? 1.08 : 1.0, 3, dt);
}
function titleCamera() {
  const fb = SCENERY.fallsBottom, a = RND.time * 0.05;
  const c = [fb[0] + 2, fb[1] + 5, fb[2] + 2];
  CAM.pos = [c[0] + Math.sin(a + 0.4) * 30, c[1] + 6 + Math.sin(a * 0.7) * 2, c[2] + Math.cos(a + 0.4) * 30 + 8];
  CAM.pos[1] = Math.max(CAM.pos[1], groundH(CAM.pos[0], CAM.pos[2]) + 3);
  CAM.tgt = [c[0], c[1] + 1, c[2] - 4]; CAM.fov = 0.95;
}

// ---------- HUD ----------
function hudUpdate(dt) {
  document.getElementById('bellyFill').style.width = (GAME.belly * 100).toFixed(1) + '%';
  // toasts
  const tEl = document.getElementById('toast');
  GAME.toastT -= dt;
  if (GAME.toastT <= 0) {
    if (GAME.toastQ.length) { const [a, b] = GAME.toastQ.shift(); tEl.innerHTML = ''; tEl.append(a); if (b) { const s = document.createElement('small'); s.textContent = b; tEl.append(s); } tEl.classList.add('on'); GAME.toastT = 2.4; }
    else tEl.classList.remove('on');
  }
  // what's in reach
  const pr = document.getElementById('prompt');
  const r = GAME.mode === 'play' && !BR.carry ? reachable() : null;
  const key = document.body.classList.contains('touch') ? 'SWIPE' : 'E';
  const msg = r ? (r.kind === 'fish' ? key + ' · grab the salmon' : r.kind === 'berry' ? key + ' · eat berries' : r.kind === 'snack' ? key + ' · eat the dropped lunch' : key + ' · raid the picnic basket')
    : (BR.swim ? (Math.hypot(BR.x - LAKE.x, BR.z - LAKE.z) < LAKE.r + 3 ? 'Swimming… keep going to cross the lake' : 'Swimming… salmon gather below the falls') : GAME.belly < 0.12 ? 'Hungry! Look for berries and fish' : '');
  if (pr.textContent !== msg) pr.textContent = msg;
  pr.classList.toggle('on', !!msg);
  bubblesUpdate(dt);
}

// ---------- quality ----------
const QUAL = { particles: 1 };
function applyQuality() {
  const dpr = window.devicePixelRatio || 1;
  const t = [[1024, 0, Math.min(dpr, 1) * 0.75, 0.5], [2048, 0, Math.min(dpr, 1.25), 0.8], [2048, 1, Math.min(dpr, 2), 1]][SET.quality] || [2048, 0, 1, 0.8];
  if (gl && RND.shadowSize !== t[0]) glMakeShadow(t[0]);
  RND.pcf = t[1]; RND.pixelRatio = t[2]; QUAL.particles = t[3]; RND.adaptive = SET.quality === 2; if (!RND.adaptive) RND.scale = 1;
  document.querySelectorAll('#segQ button').forEach(b => b.classList.toggle('on', +b.dataset.v === SET.quality));
  resize();
}
function resize() {
  const cv = document.getElementById('gl');
  const pr = RND.pixelRatio * (RND.adaptive ? RND.scale : 1);
  const w = Math.max(320, Math.floor(innerWidth * pr)), h = Math.max(200, Math.floor(innerHeight * pr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  RND.w = w; RND.h = h;
}
function setSound(v) { SET.sound = v; saveSet(); AUD.apply(); document.getElementById('bSound').textContent = v ? '🔊' : '🔇'; document.querySelectorAll('#segS button').forEach(b => b.classList.toggle('on', +b.dataset.v === v)); }

// ---------- flow ----------
function startGame() {
  AUD.init();
  document.getElementById('title').classList.add('hidden'); document.getElementById('pause').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  if (GAME.mode === 'title') { CAM.yaw = BR.yaw; CAM.curD = undefined; }
  GAME.mode = 'play';
  if (!GAME.greeted) { GAME.greeted = true; toast('Good morning, bear', document.body.classList.contains('touch') ? 'Left stick to walk. Follow the river north to the waterfall.' : 'WASD to walk, Shift to run. The waterfall is up the river.'); }
}
function pauseGame(on) {
  if (on && GAME.mode !== 'play') return;
  GAME.mode = on ? 'paused' : 'play';
  document.getElementById('pause').classList.toggle('hidden', !on);
  if (on) {
    if (document.pointerLockElement) document.exitPointerLock();
    const s = GAME.stats, n = GOALS.filter(g => GAME.done[g.id]).length;
    document.getElementById('pauseStats').textContent = `${s.fish} salmon · ${s.berries} berries · ${s.scared} hikers spooked · journal ${n}/${GOALS.length}`;
  }
}
function newDay() {
  GAME.done = {}; GAME.stats = { fish: 0, scared: 0, berries: 0, snacks: 0, photos: 0 }; GAME.belly = 0.45; journalSave(); journalRender();
  bearSpawn(...START); CAM.yaw = BR.yaw; CAM.curD = undefined;
  for (const b of SCENERY.berries) b.left = b.pts.length; for (const k of SCENERY.baskets) k.full = true; SNACKS.length = 0;
  spawnHikers(HIKERS.length); pauseGame(false); toast('A new day', 'The journal is blank again.');
}

// ---------- simulation ----------
function worldStep(dt) {
  for (const h of HIKERS) hikerStep(h, dt);
  for (const f of FISH) fishStep(f, dt);
  for (const b of SCENERY.berries) if (b.left < b.pts.length) { b.regrow -= dt; if (b.regrow <= 0) { b.left = Math.min(b.pts.length, b.left + 1); b.regrow = 6; } }
  for (const k of SCENERY.baskets) if (!k.full) { k.refill -= dt; if (k.refill <= 0 && Math.hypot(BR.x - k.x, BR.z - k.z) > 40) k.full = true; }
  for (const s of SNACKS) s.t += dt;
  fxStep(dt);
}
function tick(dt) {
  GAME.t += dt; RND.time += dt;
  if (GAME.mode === 'paused') { AUD.update(dt); return; }
  if (GAME.mode === 'play') {
    bearStep(dt, pollInput(), CAM.yaw);
    GAME.belly = Math.max(0, GAME.belly - dt / 420);
    saveT += dt; if (saveT > 5) { saveT = 0; journalSave(); }
  }
  worldStep(dt);
  if (GAME.mode === 'play') updateCamera(dt); else titleCamera();
  hudUpdate(dt);
  AUD.update(dt);
}

// ---------- drawing ----------
function drawScene() {
  glResetQueue(true);
  const M = new Float32Array(16);
  drawBear();
  for (const h of HIKERS) if (Math.hypot(h.x - RND.cam[0], h.z - RND.cam[2]) < 170) drawHiker(h);
  for (const f of FISH) if (Math.hypot(f.x - RND.cam[0], f.z - RND.cam[2]) < 90) drawFish(f);
  for (const b of SCENERY.berries) { if (Math.hypot(b.x - RND.cam[0], b.z - RND.cam[2]) > 90) continue; for (let q = 0; q < b.left; q++) { const p = b.pts[q]; m4basis(M, r3Y(0), p[0], p[1], p[2], 1, 1, 1); glPush(MESH.berry, M); } }
  for (const k of SCENERY.baskets) if (k.full) { m4basis(M, r3Y(0.4), k.x, k.y, k.z, 1, 1, 1); glPush(MESH.basket, M); }
  for (const s of SNACKS) { m4basis(M, r3YPR(s.yaw, 0, 1.3), s.x, s.y + 0.12, s.z, 1, 1, 1); glPush(MESH.pack, M); }
  fxDraw();
}
function renderFrame() {
  resize();
  if (!CAM.fixed) glSetCamera(CAM.pos, CAM.tgt, CAM.fov, RND.w / RND.h);
  drawScene();
  const c = GAME.mode === 'play' ? [BR.x, BR.y, BR.z] : CAM.tgt;
  glSetLight(c, 42);
  glRender(RND.w, RND.h, SCENERY.waters);
}
let lastTS = 0, frameAvg = 16;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (ts - (lastTS || ts)) / 1000)); lastTS = ts;
  if (!TEST || QS.has('run')) tick(dt);
  renderFrame();
  frameAvg = lerp(frameAvg, dt * 1000, 0.05);
  if (RND.adaptive && !TEST) {
    if (frameAvg > 21 && RND.scale > 0.6) { RND.scale = Math.max(0.6, RND.scale - 0.05); frameAvg = 16; resize(); }
    else if (frameAvg < 14 && RND.scale < 1) { RND.scale = Math.min(1, RND.scale + 0.05); frameAvg = 16; resize(); }
  }
}

// ---------- boot ----------
const START = [33, -2, 0];
function boot() {
  try {
    const cv = document.getElementById('gl');
    glInit(cv, TEST);
    const s = [-0.5, 0.62, 0.6], l = Math.hypot(...s); RND.sun = s.map(v => v / l);
    RND.sunCol = [3.0, 2.8, 2.45]; RND.exposure = 1.0;
    glUploadAtlas(document.createElement('canvas'));
    buildModels();
    buildWorld();
    START[2] = Math.atan2(SCENERY.fallsBottom[0] - START[0], SCENERY.fallsBottom[2] - START[1]);
    bearSpawn(...START);
    journalLoad(); journalRender();
    spawnHikers(SET.quality === 0 ? 7 : 10);
    spawnFish(SET.quality === 0 ? 18 : 26);
    initInput();
    // menus
    document.getElementById('bPlay').onclick = startGame;
    document.getElementById('bHow').onclick = () => document.getElementById('how').classList.toggle('hidden');
    document.getElementById('bResume').onclick = () => pauseGame(false);
    document.getElementById('bNewDay').onclick = newDay;
    document.getElementById('bPause').onclick = () => pauseGame(true);
    document.getElementById('bSound').onclick = () => setSound(SET.sound ? 0 : 1);
    document.getElementById('journal').onclick = () => document.getElementById('journal').classList.toggle('mini');
    document.querySelectorAll('#segQ button').forEach(b => b.onclick = () => { SET.quality = +b.dataset.v; saveSet(); applyQuality(); });
    document.querySelectorAll('#segS button').forEach(b => b.onclick = () => { AUD.init(); setSound(+b.dataset.v); });
    if (!localStorage.getItem('bramblebear.settings') && document.body.classList.contains('touch')) SET.quality = 0;
    applyQuality(); setSound(SET.sound);
    if (innerWidth < 640) document.getElementById('journal').classList.add('mini');
    addEventListener('resize', resize);
    titleCamera(); tick(0.016);
    document.getElementById('loading').remove();
    if (QS.has('play')) startGame();
    requestAnimationFrame(frame);
    window.__ready = true;
  } catch (e) {
    console.error(e);
    document.getElementById('err').textContent = 'Error: ' + e.message;
    window.__bootError = e.message;
  }
}
setTimeout(boot, 30);
